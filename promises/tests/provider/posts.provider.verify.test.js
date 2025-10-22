// tests/provider/posts.provider.verify.test.js
const path = require('path');
const http = require('http');
const { Verifier } = require('@pact-foundation/pact');

// ✅ Now safe to import index.js because it no longer auto-starts
const app = require('../../index');

try {
    const postService = require('../../modules/post/post.service');
    jest.spyOn(postService, 'getAllPosts').mockResolvedValue([
        { _id: 'p1', name: 'Sample', description: 'Desc', fileUrl: '/files/f1' }
    ]);

    jest.spyOn(postService, 'deletePost').mockImplementation(async (id) => ({
        message: 'Post deleted successfully',
        deletedId: id
    }));
} catch { }

let server, baseUrl;

beforeAll(async () => {
    server = http.createServer(app);
    await new Promise((r) => server.listen(0, r));
    baseUrl = `http://localhost:${server.address().port}`;
    console.log("base", baseUrl)
});

afterAll(async () => {
    if (server) await new Promise((r) => server.close(r));
});

test('Provider matches consumer contract for PostsAPI', async () => {
    const verifier = new Verifier({
        providerBaseUrl: baseUrl,
        pactUrls: [path.resolve(process.cwd(), 'pacts/PostsClient-PostsAPI.json')],
        // If you need to seed data for "posts exist", do it here:
        stateHandlers: {
            'posts exist': async () => ({ description: 'seeded (stubbed)' }),

            'post exists with id abc123': async () => ({ description: 'stubbed delete path' }),
        },
        // publishVerificationResult: false, // ⬅️ no providerVersion needed now
    });

    const result = await verifier.verifyProvider();
    expect(/success/i.test(result) || /finished:\s*0/i.test(result)).toBe(true);
}, 30000);


