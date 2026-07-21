export function greeting(name: string): string {
  return `Hello, ${name}! This is pocket-llm.`
}

if (import.meta.main) {
  const name = Bun.argv[2] ?? "world"
  console.log(greeting(name))
}
