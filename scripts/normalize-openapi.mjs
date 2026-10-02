// 仅为生成器规范化null分支；原始docs/openapi.yaml保持权威。
const record = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const nullOnly = (value) => record(value) && value.nullable === true && Array.isArray(value.enum) && value.enum.length === 1 && value.enum[0] === null;
const walk = (value) => {
  if (Array.isArray(value)) return value.map(walk);
  if (!record(value)) return value;
  const result = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, walk(child)]));
  if (Array.isArray(result.anyOf) && result.anyOf.some(nullOnly)) {
    result.anyOf = result.anyOf.filter((child) => !nullOnly(child));
    result.nullable = true;
  }
  return result;
};
export default (document) => walk(document);
