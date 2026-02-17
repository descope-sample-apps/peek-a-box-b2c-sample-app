"use client"

import Image from "next/image"
import { motion } from "motion/react"
import { useCart } from "@/components/cart-provider"
import type { Product } from "@/lib/products"
import { Plus, Package, Minus } from "lucide-react"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, removeFromCart, isInCart } = useCart()
  const inCart = isInCart(product.id)

  const handleClick = () => {
    if (inCart) {
      removeFromCart(product.id)
    } else {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
      })
    }
  }

  return (
    <motion.article
      className="group relative"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
        <div className="absolute inset-0 flex items-center justify-center">
          <Package className="h-16 w-16 text-foreground/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" />
        </div>
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-foreground px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-background">
            {product.badge}
          </span>
        )}
        <motion.button
          onClick={handleClick}
          className={`absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-colors ${
            inCart
              ? "bg-foreground text-background hover:bg-destructive hover:text-destructive-foreground"
              : "bg-background hover:bg-foreground hover:text-background"
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label={inCart ? `Remove ${product.name} from cart` : `Add ${product.name} to cart`}
        >
          {inCart ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </motion.button>
      </div>
      <div className="mt-4">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-medium leading-tight">{product.name}</h3>
          <p className="font-medium tabular-nums">${product.price.toFixed(2)}</p>
        </div>
        <p className="mt-1.5 text-sm italic text-muted-foreground">
          "{product.description}"
        </p>
      </div>
    </motion.article>
  )
}
