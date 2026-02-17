export interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: "chaos" | "cursed" | "premium"
  badge?: string
}

export const products: Product[] = [
  {
    id: "box-14291",
    name: "Box #14291",
    description: "Mildly Concerning",
    price: 9.99,
    image: "/placeholder.svg?height=400&width=400",
    category: "chaos",
    badge: "Bestseller",
  },
  {
    id: "box-50003",
    name: "Box #50003",
    description: "Definitely Haunted",
    price: 13.99,
    image: "/placeholder.svg?height=400&width=400",
    category: "cursed",
    badge: "Spooky",
  },
  {
    id: "box-7",
    name: "Box #7",
    description: "Suspiciously Light",
    price: 7.77,
    image: "/placeholder.svg?height=400&width=400",
    category: "chaos",
  },
  
  {
    id: "box-666",
    name: "Box #666",
    description: "Legally We Cannot Discuss This",
    price: 6.66,
    image: "/placeholder.svg?height=400&width=400",
    category: "cursed",
    badge: "Forbidden",
  },
  {
    id: "box-42",
    name: "Box #42",
    description: "The Answer To Everything",
    price: 42.00,
    image: "/placeholder.svg?height=400&width=400",
    category: "premium",
  },
  {
    id: "box-99999",
    name: "Box #99999",
    description: "Too Many Nines",
    price: 9.99,
    image: "/placeholder.svg?height=400&width=400",
    category: "chaos",
  },
  {
    id: "box-67",
    name: "Box #67",
    description: "This Makes Our CEO Laugh",
    price: 67.00,
    image: "/placeholder.svg?height=400&width=400",
    category: "premium",
    badge: "CEO Pick",
  },
  {
    id: "box-0",
    name: "Box #0",
    description: "The First One. Or Is It?",
    price: 0.01,
    image: "/placeholder.svg?height=400&width=400",
    category: "cursed",
    badge: "Origin",
  },
  {
    id: "box-π",
    name: "Box #π",
    description: "Never Ends. Neither Will Your Curiosity.",
    price: 31.41,
    image: "/placeholder.svg?height=400&width=400",
    category: "premium",
    badge: "Irrational",
  },
]

export const mysteryReveals = [
  "Your box contains... a single bean. Guard it with your life.",
  "You've unlocked unlimited potential. Unfortunately, it's not yours.",
  "It's empty. The real treasure was the impulse buy you made along the way.",
  "Warning: Contents may emotionally support you.",
  "Your box contains: a reminder of all the emails you haven't replied to.",
  "Congratulations. You bought air. But like... premium air.",
  "This box is exactly like your sleep schedule: unpredictable.",
  "You paid for this. That's between you and your bank.",
  "Your box contains a small, legally distinct gremlin.",
  "You now own a pickle with sunglasses.",
  "Inside: One (1) cloud. It may rain.",
  "A tiny ghost who thinks you're cool.",
  "Your box screamed when we opened it. We closed it again. Good luck.",
  "Contents: Existential dread (fun-sized).",
  "We put a riddle inside. We forgot the answer. Sorry.",
  "Your box contains the physical manifestation of 3am thoughts.",
]

// Specific reveals for each box that match their descriptions
export const specialReveals: Record<string, string> = {
  "box-14291": "A jar of mayonnaise with a handwritten label that says 'DO NOT OPEN'. You opened it. It winked.",
  "box-50003": "A Polaroid photo of you sleeping. We don't know how it got there. Neither do you.",
  "box-7": "A single feather. That's it. Why does it feel so heavy in your soul?",
  "box-666": "[REDACTED BY LEGAL TEAM]. Also, your lights might flicker tonight. Unrelated.",
  "box-42": "A towel, a book about dolphins, and a note that says 'Don't Panic'. You feel enlightened.",
  "box-99999": "Nine tiny boxes, each containing a smaller box. The smallest one contains the number 9.",
  "box-67": "A small cat. It looks at you with knowing eyes.",
  "box-0": "Nothing. Or was there something before you looked? The box remembers. You don't.",
  "box-π": "3.14159265358979... pieces of something. The counting never stops. It never will.",
}

export function getRevealForBox(boxId: string): string {
  // All boxes now have specific reveals
  return specialReveals[boxId] || "The box was empty. Or was it? Check behind you."
}
