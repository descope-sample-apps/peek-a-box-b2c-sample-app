"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

const CART_STORAGE_KEY = "unboxably-cart"

export interface CartItem {
  id: string
  name: string
  price: number
  image: string
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addToCart: (item: Omit<CartItem, "quantity">) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  isInCart: (id: string) => boolean
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

function parseCartItem(item: unknown): CartItem | null {
  if (
    item &&
    typeof item === "object" &&
    "id" in item &&
    typeof (item as CartItem).id === "string" &&
    "name" in item &&
    typeof (item as CartItem).name === "string" &&
    "price" in item &&
    typeof (item as CartItem).price === "number" &&
    "image" in item &&
    typeof (item as CartItem).image === "string" &&
    "quantity" in item &&
    typeof (item as CartItem).quantity === "number"
  ) {
    return item as CartItem
  }
  return null
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hasHydrated, setHasHydrated] = useState(false)

  // Load cart from localStorage on mount (survives login redirects/page reloads)
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(CART_STORAGE_KEY) : null
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          const valid = parsed
            .map(parseCartItem)
            .filter((i): i is CartItem => i !== null)
            .map((i) => ({ ...i, quantity: 1 })) // One per box max
          if (valid.length > 0) setItems(valid)
        }
      }
    } catch {
      // Ignore parse errors
    }
    setHasHydrated(true)
  }, [])

  // Persist cart to localStorage whenever it changes (after initial hydration)
  useEffect(() => {
    if (!hasHydrated || typeof window === "undefined") return
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }, [items, hasHydrated])

  const addToCart = useCallback((item: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev // One per box max
      return [...prev, { ...item, quantity: 1 }]
    })
  }, [])

  const removeFromCart = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.id !== id))
    } else {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, quantity: Math.min(quantity, 1) } : item
        )
      )
    }
  }, [])

  const isInCart = useCallback(
    (id: string) => items.some((i) => i.id === id),
    [items]
  )

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isInCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
