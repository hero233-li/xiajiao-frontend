/** 按卷子语言格式化代码。依赖按需加载，不点格式化就不下载。 */
export type CodeLang = 'sql' | 'java';

export async function formatCode(code: string, lang: CodeLang): Promise<string> {
  const source = code.replace(/\r\n/g, '\n').trim();
  if (!source) return code;

  if (lang === 'sql') {
    const { format } = await import('sql-formatter');
    return format(source, {
      language: 'mysql',
      keywordCase: 'upper',
      tabWidth: 2,
      linesBetweenQueries: 1,
    });
  }

  const [{ format }, javaPlugin] = await Promise.all([
    import('prettier/standalone'),
    import('prettier-plugin-java'),
  ]);
  const plugin = (javaPlugin as { default?: unknown }).default ?? javaPlugin;
  return format(source, {
    parser: 'java',
    plugins: [plugin] as never,
    printWidth: 100,
    tabWidth: 4,
  });
}
