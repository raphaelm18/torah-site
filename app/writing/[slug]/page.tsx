import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostView } from "@/components/PostView";
import { getPublishedPost, getPublishedPosts } from "@/lib/posts";

export function generateStaticParams() {
  return getPublishedPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPublishedPost(slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title,
    description: post.tldr,
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPublishedPost(slug);
  if (!post) notFound();
  return <PostView post={post} />;
}
