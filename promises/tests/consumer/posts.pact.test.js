const path = require('path');
const axios = require('axios'); // or axios
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { like, eachLike, iso8601DateTime } = MatchersV3;

// Name the “caller” (consumer) and “your API” (provider)
const pact = new PactV3({
    consumer: 'PostsClient',   // <- change if you want
    provider: 'PostsAPI',      // <- this must match provider verify
    dir: path.resolve(process.cwd(), 'pacts'),
});

describe('Consumer contract for GET /api/posts', () => {
    test('expects an array of posts', async () => {
        pact
            .given('posts exist')        // provider state name
            .uponReceiving('get posts')  // description
            .withRequest({
                method: 'GET',
                path: '/posts/',
            })
            .willRespondWith({
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: eachLike({
                    _id: like('p1'),
                    name: like('Sample'),
                    description: like('Desc'),
                    fileUrl: like('/files/f1'),
                    // createdAt: iso8601DateTime('2024-01-01T00:00:00Z'),
                },1 ),
            });

        await pact.executeTest(async (mockServer) => {
            const res = await axios.get(`${mockServer.url}/posts/`);
            expect(res.status).toBe(200);
            const json = res.data;
            expect(Array.isArray(json)).toBe(true);
            expect(json[0]).toHaveProperty('_id');
            expect(json[0]).toHaveProperty('name');
        });
    });
});
