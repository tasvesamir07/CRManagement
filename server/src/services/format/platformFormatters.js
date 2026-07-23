function htmlToWhatsappMarkdown(html) {
    if (!html) return '';
    let text = html;

    // Replace block tags with newlines
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/li>/gi, '\n');
    text = text.replace(/<\/h[1-6]>/gi, '\n\n');

    // Replace formatting tags
    text = text.replace(/<strong>(.*?)<\/strong>/gi, '*$1*');
    text = text.replace(/<b>(.*?)<\/b>/gi, '*$1*');
    text = text.replace(/<em>(.*?)<\/em>/gi, '_$1_');
    text = text.replace(/<i>(.*?)<\/i>/gi, '_$1_');
    text = text.replace(/<del>(.*?)<\/del>/gi, '~$1~');
    text = text.replace(/<s>(.*?)<\/s>/gi, '~$1~');
    text = text.replace(/<u>(.*?)<\/u>/gi, '_$1_');
    text = text.replace(/<code>(.*?)<\/code>/gi, '`$1`');
    text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '```\n$1\n```');

    // Bullet lists
    text = text.replace(/<li>/gi, '• ');

    // Strip all other HTML tags
    text = text.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    text = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, ' ');

    // Standardize multiple newlines
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
}

function cleanHtmlForTelegram(html) {
    if (!html) return '';
    let text = html;

    // Replace block tags with newlines
    text = text.replace(/<p>/gi, '');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/li>/gi, '\n');
    text = text.replace(/<li>/gi, '• ');
    text = text.replace(/<ul>/gi, '');
    text = text.replace(/<\/ul>/gi, '\n');
    text = text.replace(/<ol>/gi, '');
    text = text.replace(/<\/ol>/gi, '\n');

    // Convert headers to Bold
    text = text.replace(/<h[1-6]>(.*?)<\/h[1-6]>/gi, '<b>$1</b>\n');

    // Keep allowed tags: b, strong, i, em, u, ins, s, strike, del, code, pre, a
    // Remove spans and divs but keep their content
    text = text.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
    text = text.replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n');

    // Regex to match allowed tags in Telegram HTML
    const allowedTags = /<\/?(b|strong|i|em|u|ins|s|strike|del|code|pre|a\b[^>]*)(>|\s[^>]*>)/gi;

    let result = '';
    let match;
    let lastIndex = 0;
    const tagRegex = /<[^>]+>/g;

    while ((match = tagRegex.exec(text)) !== null) {
        const tag = match[0];
        const isAllowed = allowedTags.test(tag);
        allowedTags.lastIndex = 0; // Reset regex
        
        result += text.substring(lastIndex, match.index);
        if (isAllowed) {
            result += tag;
        }
        lastIndex = tagRegex.lastIndex;
    }
    result += text.substring(lastIndex);

    // Standardize multiple newlines
    result = result.replace(/\n{3,}/g, '\n\n');

    return result.trim();
}

function stripHtml(html) {
    if (!html) return '';
    let text = html;

    // Replace block tags with space/newlines
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/li>/gi, '\n');
    text = text.replace(/<li>/gi, '• ');
    text = text.replace(/<\/h[1-6]>/gi, '\n');

    // Strip all tags
    text = text.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    text = text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, ' ');

    // Standardize multiple newlines
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
}

function formatWhatsApp(announcement, _course) {
    let content = announcement.content;
    if (announcement.category === 'share_file') {
        content = announcement.content === 'Shared File(s)' ? '' : (announcement.content || '');
    }
    if (!content) return '';
    
    const isHtml = content.startsWith('<') || /<[a-z][\s\S]*>/i.test(content);
    if (isHtml) {
        return htmlToWhatsappMarkdown(content);
    }
    return content;
}

function formatTelegram(announcement, _course) {
    let content = announcement.content;
    if (announcement.category === 'share_file') {
        content = announcement.content === 'Shared File(s)' ? '' : (announcement.content || '');
    }
    if (!content) return '';
    
    const isHtml = content.startsWith('<') || /<[a-z][\s\S]*>/i.test(content);
    if (isHtml) {
        return cleanHtmlForTelegram(content);
    }
    return content;
}

function formatMessenger(announcement, _course) {
    let content = announcement.content;
    if (announcement.category === 'share_file') {
        content = announcement.content === 'Shared File(s)' ? '' : (announcement.content || '');
    }
    if (!content) return '';
    
    const isHtml = content.startsWith('<') || /<[a-z][\s\S]*>/i.test(content);
    if (isHtml) {
        return stripHtml(content);
    }
    
    return content
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/_(.*?)_/g, '$1')
        .replace(/~(.*?)~/g, '$1')
        .replace(/`(.*?)`/g, '$1');
}

module.exports = {
    htmlToWhatsappMarkdown,
    cleanHtmlForTelegram,
    stripHtml,
    formatWhatsApp,
    formatTelegram,
    formatMessenger
};
