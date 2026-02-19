export interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  category: "bestsellers" | "new" | "premium"
  badge?: string
}

export const products: Product[] = [
  {
    id: "box-14291",
    name: "Box #14291",
    description: "Mildly Concerning",
    price: 9.99,
    image: "/placeholder.svg?height=400&width=400",
    category: "bestsellers",
    badge: "Bestseller",
  },
  {
    id: "box-50003",
    name: "Box #50003",
    description: "Definitely Haunted",
    price: 13.99,
    image: "/placeholder.svg?height=400&width=400",
    category: "new",
  },
  {
    id: "box-7",
    name: "Box #7",
    description: "Suspiciously Light",
    price: 7.77,
    image: "/placeholder.svg?height=400&width=400",
    category: "bestsellers",
  },
  
  {
    id: "box-666",
    name: "Box #666",
    description: "Legally We Cannot Discuss This",
    price: 6.66,
    image: "/placeholder.svg?height=400&width=400",
    category: "new",
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
    category: "bestsellers",
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
    category: "new",
  },
  {
    id: "box-π",
    name: "Box #π",
    description: "Never Ends. Neither Will Your Curiosity.",
    price: 31.41,
    image: "/placeholder.svg?height=400&width=400",
    category: "premium",
  },
]

// Specific reveals for each box that match their descriptions
export const specialReveals: Record<string, string> = {
  "box-14291": "Your box contains: a reminder of all the emails you haven't replied to.",
  "box-50003": "Your box contains the physical manifestation of 3am thoughts.",
  "box-7": "Your box contains... that one pickleball that bounces perfectly. Guard it with your life.",
  "box-666": "[REDACTED BY LEGAL TEAM]. Also, your lights might flicker tonight. Unrelated.",
  "box-42": "Congratulations. You bought air. But like... premium air.",
  "box-99999": "Nine tiny boxes, each containing a smaller box. The smallest one contains the number 9.",
  "box-67": "A small cat.",
  "box-0": "Nothing. Or was there something before you looked? The box remembers. You don't.",
  "box-π": "3.14159265358979... pieces of something. You're welcome.",
}

export function getRevealForBox(boxId: string): string {
  // All boxes now have specific reveals
  return specialReveals[boxId] || "The box was empty. Or was it? Check behind you."
}
