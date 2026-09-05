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
        // Если в кэше ошибка ("..."), пробуем получить новое слово
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
            headers: {
              'User-Agent': 'HulioWordBot/1.0 (contact: example@email.com)' 
            }
          });

          if (!response.ok) continue;
          
          const data = await response.json();
          const word = data.title;
          
          // Проверяем, что слово корректное (не пустое, не слишком длинное)
          if (word && word.length > 1 && word.length < 50) {
            return word;
          }
        } catch (e) {
          console.error("API Error for", url, ":", e);
          continue;
        }
      }
      
      return null; // Все источники не сработали
    }

    // 4. Получаем слово
    const word = await fetchRandomWord();
    
    if (!word) {
      // Не кэшируем ошибку, возвращаем сразу
      return new Response(JSON.stringify({ word: "...", date: dateKey, error: "Не удалось получить слово" }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' 
        }
      });
    }
    
    const resultData = JSON.stringify({ word: word, date: dateKey });
    
    // Кэшируем только успешный результат
    await env.WORD_STORE.put(dateKey, resultData, { expirationTtl: 86400 });

    return new Response(resultData, {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      }
    });
  }
};