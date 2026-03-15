import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const res = await fetch(`${BASE_URL}/api/discovery/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { title: "Hotel" };
    const json = await res.json();
    const data = json?.data;
    if (!data) return { title: "Hotel" };
    const tenant = data.tenant;
    const name = tenant?.name ?? data.name ?? "Hotel";
    const description =
      tenant?.description ||
      data.description ||
      `Book your stay at ${name}. Rooms, events, pool and more.`;
    const title = `${name} | Bookgh`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
      },
    };
  } catch {
    return { title: "Hotel" };
  }
}

export default function HotelSlugLayout({ children }: Props) {
  return <>{children}</>;
}
