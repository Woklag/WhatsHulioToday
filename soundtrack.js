// soundtrack.js
const DRUMS_COUNT = 269;
const INSTRUMENTS_COUNT = 405;
const SAMPLE_BASE_FREQ = 261.63;

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

const SCALES = [
    { cents: [0, 200, 350, 500, 700, 900, 1050, 1200] },
    { cents: [0, 100, 300, 500, 700, 850, 1000, 1200] },
    { cents: [0, 150, 350, 500, 700, 850, 1050, 1200] },
    { cents: Array.from({length: 20}, (_, i) => i * (1200/19)) },
    { cents: Array.from({length: 25}, (_, i) => i * 50) },
    { cents: [0, 120, 280, 460, 680, 820, 950, 1200] },
    { cents: [0, 240, 480, 720, 960, 1200] },
    { cents: [0, 200, 300, 500, 700, 900, 1000, 1200] },
    { cents: [0, 100, 300, 500, 700, 800, 1000, 1200] },
    { cents: [0, 200, 400, 600, 700, 900, 1100, 1200] },
    { cents: [0, 100, 400, 500, 700, 800, 1100, 1200] },
    { cents: [0, 100, 350, 600, 700, 800, 1100, 1200] },
    { cents: [0, 200, 300, 500, 700, 800, 1000, 1200] }
];

function centsToFreq(baseHz, cents) {
    return baseHz * Math.pow(2, cents / 1200);
}

function buildScale(baseHz, centsArray, octaves) {
    const freqs = [];
    for (let oct = 0; oct < octaves; oct++) {
        const octBase = baseHz * Math.pow(2, oct);
        for (let i = 0; i < centsArray.length; i++) {
            if (oct < octaves - 1 || centsArray[i] < 1200) {
                freqs.push(centsToFreq(octBase, centsArray[i]));
            }
        }
    }
    freqs.push(baseHz * Math.pow(2, octaves));
    return freqs;
}

async function loadAudioBuffer(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Не удалось загрузить файл: ${url} (Ошибка ${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return await Tone.getContext().rawContext.decodeAudioData(arrayBuffer);
}

function generateMelodyWalk(scale, length) {
    const pattern = [];
    let currentIndex = Math.floor(Math.random() * scale.length);
    for (let i = 0; i < length; i++) {
        if (Math.random() < 0.25) {
            pattern.push({ note: scale[currentIndex], play: true });
            const step = randomInt(-2, 2);
            currentIndex = Math.max(0, Math.min(scale.length - 1, currentIndex + step));
        } else {
            pattern.push({ note: null, play: false });
        }
    }
    return pattern;
}

function generateMelodyPhrases(scale, length) {
    const pattern = [];
    let i = 0;
    while (i < length) {
        const phraseLength = randomInt(2, 4);
        for (let j = 0; j < phraseLength && i < length; j++, i++) {
            if (Math.random() < 0.7) {
                const note = scale[Math.floor(Math.random() * scale.length)];
                pattern.push({ note, play: true });
            } else {
                pattern.push({ note: null, play: false });
            }
        }
        const pauseLength = randomInt(2, 6);
        for (let j = 0; j < pauseLength && i < length; j++, i++) {
            pattern.push({ note: null, play: false });
        }
    }
    return pattern;
}

function generateMelodyMotifs(scale, length) {
    const pattern = [];
    const motifLength = randomInt(3, 5);
    const motif = [];
    for (let i = 0; i < motifLength; i++) {
        motif.push(scale[Math.floor(Math.random() * scale.length)]);
    }
    let i = 0;
    while (i < length) {
        const currentMotif = [...motif];
        if (Math.random() < 0.3) {
            const changesCount = randomInt(1, 2);
            for (let c = 0; c < changesCount; c++) {
                const pos = randomInt(0, currentMotif.length - 1);
                currentMotif[pos] = scale[Math.floor(Math.random() * scale.length)];
            }
        }
        for (let j = 0; j < currentMotif.length && i < length; j++, i++) {
            if (Math.random() < 0.8) {
                pattern.push({ note: currentMotif[j], play: true });
            } else {
                pattern.push({ note: null, play: false });
            }
        }
        const pauseLength = randomInt(1, 4);
        for (let j = 0; j < pauseLength && i < length; j++, i++) {
            pattern.push({ note: null, play: false });
        }
    }
    return pattern;
}

function generateMethodRatios() {
    const walk = randomInt(0, 10) * 10;
    const phrases = randomInt(0, 10) * 10;
    const motifs = 100 - walk - phrases;
    if (motifs < 0) return generateMethodRatios();
    return { walk, phrases, motifs };
}

function generateCombinedMelody(scale, totalLength, ratios) {
    const walkLength = Math.floor(totalLength * ratios.walk / 100);
    const phrasesLength = Math.floor(totalLength * ratios.phrases / 100);
    const motifsLength = totalLength - walkLength - phrasesLength;
    const segments = [];
    if (walkLength > 0) segments.push(generateMelodyWalk(scale, walkLength));
    if (phrasesLength > 0) segments.push(generateMelodyPhrases(scale, phrasesLength));
    if (motifsLength > 0) segments.push(generateMelodyMotifs(scale, motifsLength));
    for (let i = segments.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [segments[i], segments[j]] = [segments[j], segments[i]];
    }
    return segments.flat();
}

const EFFECTS_FACTORIES = [
    () => {
        const delayTime = randomFloat(0.2, 1.0); // Исправлено: было до 3.0, что вызывало варнинг
        const feedback = randomFloat(0.1, 0.7);
        const wet = randomFloat(0, 1);
        const effect = new Tone.FeedbackDelay(delayTime, feedback);
        effect.wet.value = wet;
        return { effect };
    },
    () => {
        const frequency = randomFloat(0.5, 4);
        const depth = randomFloat(0.3, 1);
        const wet = randomFloat(0.3, 1);
        const effect = new Tone.Chorus(frequency, randomFloat(5, 20), depth);
        effect.wet.value = wet;
        effect.start();
        return { effect };
    },
    () => {
        const distortion = randomFloat(0.2, 1);
        const wet = randomFloat(0.3, 1);
        const effect = new Tone.Distortion(distortion);
        effect.wet.value = wet;
        return { effect };
    },
    () => {
        const pitch = randomInt(-12, 3);
        const windowSize = randomFloat(0.05, 0.2);
        const wet = randomFloat(0.3, 1);
        const effect = new Tone.PitchShift({ pitch, windowSize });
        effect.wet.value = wet;
        return { effect };
    },
    () => {
        const bits = randomInt(3, 10);
        const wet = randomFloat(0.3, 1);
        const effect = new Tone.BitCrusher(bits);
        effect.wet.value = wet;
        return { effect };
    },
    () => {
        const decay = randomFloat(0.5, 7);
        const wet = randomFloat(0.2, 1);
        const effect = new Tone.Reverb(decay);
        effect.wet.value = wet;
        return { effect };
    }
];

function createRandomEffect() {
    const factory = EFFECTS_FACTORIES[Math.floor(Math.random() * EFFECTS_FACTORIES.length)];
    return factory();
}

let currentSequences = [];
let currentEffects = [];
let hasGeneratedAndPlayed = false;

async function playSoundtrack() {
    if (hasGeneratedAndPlayed) return;

    try {
        // 1. Будим аудио
        await Tone.start();
        console.log("AudioContext успешно запущен");
        
        // Гарантируем, что мастер-громкость на максимуме
        Tone.Destination.volume.value = 0; 

        Tone.Transport.stop();
        Tone.Transport.cancel();
        currentSequences.forEach(seq => seq.dispose());
        currentEffects.forEach(e => e.dispose());
        currentSequences = [];
        currentEffects = [];

        const DURATION = randomInt(7, 93);
        const bpm = randomInt(28, 166);

        const selectedScale = SCALES[Math.floor(Math.random() * SCALES.length)];
        const CURRENT_SCALE = buildScale(SAMPLE_BASE_FREQ, selectedScale.cents, 2);

        const kickNum = randomInt(1, DRUMS_COUNT);
        const snareNum = randomInt(1, DRUMS_COUNT);
        const hatNum = randomInt(1, DRUMS_COUNT);
        const melodyNum = randomInt(1, INSTRUMENTS_COUNT);

        console.log(`Загрузка: drum (${kickNum}), drum (${snareNum}), drum (${hatNum}), instrument (${melodyNum})`);

        const [kickBuffer, snareBuffer, hatBuffer, melodyBuffer] = await Promise.all([
            loadAudioBuffer(`drums/drum (${kickNum}).wav`),
            loadAudioBuffer(`drums/drum (${snareNum}).wav`),
            loadAudioBuffer(`drums/drum (${hatNum}).wav`),
            loadAudioBuffer(`instruments/instrument (${melodyNum}).wav`)
        ]);

        const kickPlayer = new Tone.Player(kickBuffer);
        const snarePlayer = new Tone.Player(snareBuffer);
        const hatPlayer = new Tone.Player(hatBuffer);
        const melodyPlayer = new Tone.Player(melodyBuffer);

        const kickFx = createRandomEffect();
        const snareFx = createRandomEffect();
        const hatFx = createRandomEffect();
        const melodyFx = createRandomEffect();
        const masterFx = createRandomEffect();

        // ИСПРАВЛЕНИЕ: Лимитер -19 глушил звук. Ставим -1 (стандартное безопасное значение)
        const limiter = new Tone.Limiter(-1).toDestination();

        kickPlayer.connect(kickFx.effect).connect(masterFx.effect).connect(limiter);
        snarePlayer.connect(snareFx.effect).connect(masterFx.effect).connect(limiter);
        hatPlayer.connect(hatFx.effect).connect(masterFx.effect).connect(limiter);
        melodyPlayer.connect(melodyFx.effect).connect(masterFx.effect).connect(limiter);

        currentEffects = [kickFx.effect, snareFx.effect, hatFx.effect, melodyFx.effect, masterFx.effect];

        Tone.Transport.bpm.value = bpm;

        const totalSixteenthNotes = Math.floor((bpm / 60) * DURATION * 4);
        
        const methodRatios = generateMethodRatios();
        const fullMelodyPattern = generateCombinedMelody(CURRENT_SCALE, totalSixteenthNotes, methodRatios);

        const totalNotes = fullMelodyPattern.filter(x => x.play).length;
        let melodyPattern;

        if (totalNotes < 3) {
            melodyPattern = fullMelodyPattern;
        } else {
            const targetNotes = randomInt(3, totalNotes);
            let noteCount = 0;
            let cutPosition = 0;
            for (let i = 0; i < fullMelodyPattern.length; i++) {
                if (fullMelodyPattern[i].play) {
                    noteCount++;
                    if (noteCount === targetNotes) {
                        cutPosition = i + 1;
                        break;
                    }
                }
            }
            melodyPattern = fullMelodyPattern.slice(0, cutPosition);
        }

        const melodyRhythmMap = [];
        for (let i = 0; i < totalSixteenthNotes; i++) {
            const melodyIndex = i % melodyPattern.length;
            melodyRhythmMap.push(melodyPattern[melodyIndex].play ? 1 : 0);
        }

        const interactionTypes = ['sync', 'contrast', 'density', 'independent'];
        const interactionType = interactionTypes[Math.floor(Math.random() * interactionTypes.length)];
        const couplingStrength = randomFloat(0.3, 0.8);

        const kickPattern = [], snarePattern = [], hatPattern = [];

        for (let i = 0; i < totalSixteenthNotes; i++) {
            const strong = i % 4 === 0;
            const melodyActive = melodyRhythmMap[i];
            
            let kickProb, snareProb, hatProb;
            
            if (interactionType === 'sync') {
                if (melodyActive) {
                    kickProb = 0.4 + (couplingStrength * 0.4);
                    snareProb = 0.2 + (couplingStrength * 0.3);
                    hatProb = 0.3 + (couplingStrength * 0.4);
                } else {
                    kickProb = 0.1;
                    snareProb = 0.05;
                    hatProb = 0.2;
                }
            } else if (interactionType === 'contrast') {
                if (melodyActive) {
                    kickProb = 0.1;
                    snareProb = 0.05;
                    hatProb = 0.15;
                } else {
                    kickProb = 0.3 + (couplingStrength * 0.4);
                    snareProb = 0.2 + (couplingStrength * 0.3);
                    hatProb = 0.4 + (couplingStrength * 0.3);
                }
            } else if (interactionType === 'density') {
                if (melodyActive) {
                    kickProb = 0.2;
                    snareProb = 0.1;
                    hatProb = 0.25;
                } else {
                    kickProb = 0.5 + (couplingStrength * 0.3);
                    snareProb = 0.3 + (couplingStrength * 0.2);
                    hatProb = 0.5 + (couplingStrength * 0.2);
                }
            } else {
                kickProb = strong ? 0.5 : 0.15;
                snareProb = 0.15;
                hatProb = 0.4;
            }
            
            if (strong && interactionType !== 'independent') {
                kickProb = Math.max(kickProb, 0.3);
            }
            
            kickPattern.push(Math.random() < kickProb ? 1 : 0);
            snarePattern.push(Math.random() < snareProb ? 1 : 0);
            hatPattern.push(Math.random() < hatProb ? 1 : 0);
        }

        const drumIdx = Array.from({ length: totalSixteenthNotes }, (_, i) => i);
        const melodyIdx = Array.from({ length: melodyPattern.length }, (_, i) => i);

        const kickSeq = new Tone.Sequence((time, i) => { if (kickPattern[i]) kickPlayer.start(time); }, drumIdx, "16n");
        const snareSeq = new Tone.Sequence((time, i) => { if (snarePattern[i]) snarePlayer.start(time); }, drumIdx, "16n");
        const hatSeq = new Tone.Sequence((time, i) => { if (hatPattern[i]) hatPlayer.start(time); }, drumIdx, "16n");
        
        const melodySeq = new Tone.Sequence((time, i) => {
            // ДОБАВЛЕНА ЗАЩИТА: проверяем, что нота существует
            if (melodyPattern[i].play && melodyPattern[i].note) {
                melodyPlayer.playbackRate = melodyPattern[i].note / SAMPLE_BASE_FREQ;
                melodyPlayer.start(time);
            }
        }, melodyIdx, "16n");

        currentSequences = [kickSeq, snareSeq, hatSeq, melodySeq];

        Tone.Transport.start();
        hasGeneratedAndPlayed = true;
        console.log("Трек успешно сгенерирован и запущен!");

    } catch (error) {
        console.error("Критическая ошибка:", error);
        // Явное уведомление, если файлы не найдены
        alert("Ошибка звука: " + error.message + "\n\nУбедитесь, что папки 'drums' и 'instruments' с .wav файлами находятся в той же директории, что и HTML файл!");
    }
}

window.playSoundtrack = playSoundtrack;