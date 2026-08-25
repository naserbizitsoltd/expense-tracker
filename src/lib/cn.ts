type ClassValue = string | number | bigint | null | undefined | false | ClassValue[]

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = []
  for (const input of inputs) {
    if (!input) continue
    if (Array.isArray(input)) {
      classes.push(cn(...input))
    } else {
      classes.push(String(input))
    }
  }
  return classes.join(' ')
}