const EMOJI_SERVICE = 'https://cdn.jsdelivr.net/npm/@svgmoji/openmoji@2.0.0/svg/';

export async function emojiToSvg(emoji: string) {
    const iconCode = emoji.codePointAt(0)?.toString(16);
    const response = await fetch(EMOJI_SERVICE + `${iconCode}.svg`);
    if (!response.ok) {
        return emoji;
    }
    return response.text();
}

