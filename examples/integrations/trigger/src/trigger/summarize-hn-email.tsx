import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Link,
} from "@react-email/components";

interface Article {
  title: string;
  link: string;
  summary: string | null;
}

export const HNSummaryEmail: React.FC<{ articles: Article[] }> = ({
  articles,
}) => (
  <Html>
    <Head />
    <Body style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <Container>
        <Heading as="h1">Your Morning HN Summary</Heading>
        {articles.map((article, index) => (
          <Section key={index} style={{ marginBottom: "20px" }}>
            <Heading as="h3">
              <Link href={article.link}>{article.title}</Link>
            </Heading>
            <Text>{article.summary || "No summary available"}</Text>
          </Section>
        ))}
      </Container>
    </Body>
  </Html>
);
