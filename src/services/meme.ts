const SUBREDDITS = ["memes", "dankmemes", "ProgrammerHumor"];

interface RedditMeme {
  title: string;
  url: string;
  subreddit: string;
  permalink: string;
}

export async function fetchRedditMeme(): Promise<RedditMeme | null> {
  const sub = SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];

  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=50`, {
      headers: { "User-Agent": "ToKaBot/1.0" },
    });
    const data = (await res.json()) as {
      data: { children: { data: { post_hint?: string; over_18?: boolean; title: string; url: string; subreddit_name_prefixed: string; permalink: string } }[] };
    };
    const posts = data.data.children.filter(
      (p: { data: { post_hint?: string; over_18?: boolean } }) =>
        p.data.post_hint === "image" && !p.data.over_18
    );

    if (posts.length === 0) return null;

    const post = posts[Math.floor(Math.random() * posts.length)].data;
    return {
      title: post.title,
      url: post.url,
      subreddit: post.subreddit_name_prefixed,
      permalink: `https://reddit.com${post.permalink}`,
    };
  } catch {
    return null;
  }
}

export async function generateMeme(
  templateId: string,
  topText: string,
  bottomText: string
): Promise<string | null> {
  const username = process.env.IMGFLIP_USERNAME;
  const password = process.env.IMGFLIP_PASSWORD;

  if (!username || !password) return null;

  try {
    const params = new URLSearchParams({
      template_id: templateId,
      username,
      password,
      text0: topText,
      text1: bottomText,
    });

    const res = await fetch("https://api.imgflip.com/caption_image", {
      method: "POST",
      body: params,
    });
    const data = (await res.json()) as { success: boolean; data: { url: string } };

    return data.success ? data.data.url : null;
  } catch {
    return null;
  }
}
