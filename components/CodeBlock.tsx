import { codeToHtml } from 'shiki';

interface Props {
  code: string;
  lang?: string;
}

export default async function CodeBlock({ code, lang = 'typescript' }: Props) {
  const html = await codeToHtml(code.trim(), {
    lang,
    theme: 'github-dark-dimmed',
  });
  return (
    <div
      className="code-block"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
