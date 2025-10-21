const bus = require('../events/eventBus');
const POST = require('../events/post.events');

// Example: write to audit log / send notif / invalidate cache
bus.on(POST.FILE_UPLOADED, ({ fileId, filename, by }) => {
    console.log(`[AUDIT] File uploaded ${fileId} (${filename}) by ${by || 'system'}`);
});

bus.on(POST.CREATED, ({ postId, fileId, name }) => {
    console.log(`[AUDIT] Post created ${postId} [name="${name}"] file=${fileId}`);
    // e.g., invalidateCache('posts:list');
});

bus.on(POST.DELETED, ({ postId, fileId }) => {
    console.log(`[AUDIT] Post deleted ${postId}, file=${fileId || 'n/a'}`);
});

bus.on(POST.DELETE_FAILED, ({ postId, reason }) => {
    console.warn(`[ALERT] Delete failed for post=${postId}; reason=${reason}`);
});

module.exports = {}; // just to be importable
