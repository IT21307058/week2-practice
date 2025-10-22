const path = require("path");
const axios = require("axios");
const { PactV3, MatchersV3 } = require("@pact-foundation/pact");
const { like } = MatchersV3;

const pact = new PactV3({
  consumer: "PostsClient",
  provider: "PostsAPI",
  dir: path.resolve(process.cwd(), "pacts"),
});

describe("Consumer contract for DELETE /api/posts/:id", () => {
  test("should delete a post and receive a success message", async () => {
    const postId = "abc123";

    pact
      .given("post exists with id abc123")
      .uponReceiving("a request to delete a post")
      .withRequest({
        method: "DELETE",
        path: `/posts/${postId}`,
        // headers: { "Accept": "application/json" },
      })
      .willRespondWith({
        status: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: {
          success: true,
          message: like("Post deleted successfully"),
          deletedId: like(postId),
          requestId: like("uuid-1234"),
        },
      });

    await pact.executeTest(async (mockServer) => {
      const res = await axios.delete(`${mockServer.url}/posts/${postId}`);
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data).toHaveProperty("deletedId");
    });
  });
});
