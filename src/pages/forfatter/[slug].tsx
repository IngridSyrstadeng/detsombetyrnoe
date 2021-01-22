import { GetStaticPaths, GetStaticProps } from "next";
import { getClient, usePreviewSubscription } from "../../lib/sanity";
import groq from "groq";
import { useRouter } from "next/router";
import Error from "next/error";
import { isDevelopment } from "../../utils/environment";

const pathQuery = groq`*[_type == "forfatter"][].slug.current`;

export const getStaticPaths: GetStaticPaths = async (context) => {
  const forfatterSlugs = await getClient(false).fetch(pathQuery);
  return {
    paths: forfatterSlugs.filter(Boolean).map((slug: string) => ({ params: { slug } })),
    fallback: true,
  };
};

const forfatterQuery = groq`
  *[_type == "forfatter" && slug.current == $slug][0] {
    ...,
    "slug": slug.current
  }
`;

export const getStaticProps: GetStaticProps = async (ctx) => {
  const preview = !!ctx.preview || isDevelopment();
  const data = await getClient(preview).fetch(forfatterQuery, { slug: ctx.params?.slug });
  return {
    props: { data, preview },
    revalidate: 600,
  };
};

const PreviewWrapper = (props: { data: any; preview?: boolean }) => {
  const router = useRouter();
  if (!router.isFallback && !props.data?.slug) {
    return <Error statusCode={404} />;
  }

  const enablePreview = !!props.preview || !!router.query.preview;

  const { data } = usePreviewSubscription(forfatterQuery, {
    params: { slug: props.data?.slug },
    initialData: props.data,
    enabled: enablePreview,
  });

  return <pre>{JSON.stringify(data, undefined, 2)}</pre>;
};

export default PreviewWrapper;
