export default {
  async fetch(request, env) {
    // 1. Определяем текущую дату по Москве (YYYY-MM-DD)
    const now = new Date();
    const moscowTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Moscow"}));
    const dateKey = moscowTime.toISOString().split('T')[0];

    // 2. Проверяем KV хранилище
    if (env.WORD_STORE) {
      const cachedData = await env.WORD_STORE.get(dateKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (parsed.word !== "...") {
          return new Response(cachedData, {
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*' 
            }
          });
        }
      }
    } else {
      return new Response(JSON.stringify({ error: "KV Store not configured" }), { status: 500 });
    }

    // 3. Функция для получения случайного слова
    async function fetchRandomWord() {
      const sources = [
        'https://ru.wikipedia.org/api/rest_v1/page/random/summary',
        'https://ru.wiktionary.org/api/rest_v1/page/random/summary'
      ];

      for (const url of sources) {
        try {
          const response = await fetch(url, {
            headers: { 'User-Agent': 'HulioWordBot/1.0 (contact: example@email.com)' }
          });
          if (!response.ok) continue;
          
          const data = await response.json();
          const word = data.title;
          
          if (word && word.length > 1 && word.length < 50) {
            return word;
          }
        } catch (e) {
          continue;
        }
      }
      return null;
    }

    // 4. Функция для получения случайной картинки
    async function fetchRandomImage() {
      const sources = [
        'https://ru.wikipedia.org/api/rest_v1/page/random/summary',
        'https://en.wikipedia.org/api/rest_v1/page/random/summary'
      ];

      for (const url of sources) {
        try {
          const response = await fetch(url, {
            headers: { 'User-Agent': 'HulioWordBot/1.0 (contact: example@email.com)' }
          });
          if (!response.ok) continue;
          
          const data = await response.json();
          const imageUrl = data.originalimage?.source || data.thumbnail?.source || null;
          
          if (imageUrl) {
            return imageUrl;
          }
        } catch (e) {
          continue;
        }
      }
      return null;
    }

    // 5. Функция для получения звука (с настоящим рандомом)
    async function fetchRandomSound(env) {
      const token = env.FREESOUND_TOKEN ? env.FREESOUND_TOKEN.trim() : null;
      
      if (!token) {
        console.error("Freesound: Токен не найден или пуст");
        return null;
      }

      try {
        const query = ""; 
        const filter = "duration:[0 TO 93]";
        
        // Получаем 10 звуков и выбираем случайный
        const page = Math.floor(Math.random() * 100); // Случайная страница (0-99)
        const page_size = 10; // Получаем 10 звуков
        
        const url = `https://freesound.org/apiv2/search/?query=${encodeURIComponent(query)}&sort=random&filter=${encodeURIComponent(filter)}&fields=previews,duration&page=${page}&page_size=${page_size}&token=${token}`;
        
        console.log("Freesound Request URL:", url);
        
        const response = await fetch(url, {
          headers: { 'User-Agent': 'HulioWordBot/1.0' }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Freesound API HTTP Error: ${response.status}`, errorText);
          return null;
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          // Выбираем СЛУЧАЙНЫЙ звук из полученных 10
          const randomIndex = Math.floor(Math.random() * data.results.length);
          const selectedSound = data.results[randomIndex];
          
          const soundUrl = selectedSound.previews['preview-hq-mp3'] || selectedSound.previews['preview-lq-mp3'];
          console.log(`Freesound success: выбран звук #${randomIndex} из ${data.results.length}`, soundUrl);
          return soundUrl;
        }
        
        console.error("Freesound: Пустой результат. Полный ответ API:", JSON.stringify(data));
        return null;
        
      } catch (e) {
        console.error("Freesound fetch failed:", e.message);
        return null;
      }
    }

    // 6. Получаем данные параллельно
    const [word, imageUrl, soundUrl] = await Promise.all([
      fetchRandomWord(),
      fetchRandomImage(),
      fetchRandomSound(env)
    ]);
    
    if (!word) {
      return new Response(JSON.stringify({ 
        word: "...", 
        image: null,
        sound: null,
        date: dateKey, 
        error: "Не удалось получить слово" 
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }
    
    // 7. Формируем строгий ответ
    const resultData = JSON.stringify({ 
      word: word, 
      image: imageUrl || null, 
      sound: soundUrl || null, 
      date: dateKey 
    });
    
    await env.WORD_STORE.put(dateKey, resultData, { expirationTtl: 86400 });

    return new Response(resultData, {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }
};
