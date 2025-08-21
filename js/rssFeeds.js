// RSS Feed Handler
async function fetchRSSFeed(url, maxItems = 5) {
    try {
        // Using rss2json service to convert RSS to JSON
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
        const data = await response.json();
        return data.items?.slice(0, maxItems) || [];
    } catch (error) {
        console.error('Error fetching RSS feed:', error);
        return [];
    }
}

function createFeedItem(item) {
    const date = new Date(item.pubDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    return `
        <a href="${item.link}" target="_blank" rel="noopener" class="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition rounded-lg">
            <div class="flex justify-between items-start gap-4">
                <div class="flex-1">
                    <h4 class="font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">${item.title}</h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">${item.description.replace(/<[^>]*>/g, '')}</p>
                </div>
                <time class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">${date}</time>
            </div>
        </a>
    `;
}

function updateFeedSection(elementId, items) {
    const container = document.getElementById(elementId);
    if (!container) return;

    const content = items.map(createFeedItem).join('');
    container.innerHTML = content || '<p class="text-center text-gray-500 dark:text-gray-400 p-4">No items to display</p>';
}

// Initialize RSS Feeds
async function initializeRSSFeeds() {
    const marketNews = await fetchRSSFeed('https://www.livemint.com/rss/markets');
    const mutualFunds = await fetchRSSFeed('https://freefincal.com/category/mutual-funds/feed/');

    updateFeedSection('market-feed', marketNews);
    updateFeedSection('mutual-fund-feed', mutualFunds);
}

document.addEventListener('DOMContentLoaded', initializeRSSFeeds);
