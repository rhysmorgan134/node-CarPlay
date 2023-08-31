export const clamp = (number: number, min: number, max: number) => {
  return Math.max(min, Math.min(number, max))
}
