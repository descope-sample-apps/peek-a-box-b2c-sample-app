"use client"

import { motion } from "motion/react"
import { useCart } from "@/components/cart-provider"
import type { Product } from "@/lib/products"
import { Plus, Minus } from "lucide-react"

interface ProductCardProps {
  product: Product
}

function boxNumber(product: Product): string {
  const match = product.name.match(/#(\S+)/)
  return match ? match[1] : product.id.replace(/^box-/, "")
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, removeFromCart, isInCart } = useCart()
  const inCart = isInCart(product.id)
  const number = boxNumber(product)

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
        <div className="absolute inset-0 flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
          <div className="relative flex h-[52%] w-[52%] max-h-44 max-w-44 items-center justify-center">
            <img
              src="/Peek-A-Box_icon-light.svg"
              alt=""
              className="absolute inset-0 h-full w-full object-contain dark:hidden"
              aria-hidden
            />
            <img
              src="/Peek-A-Box_icon-dark.svg"
              alt=""
              className="absolute inset-0 hidden h-full w-full object-contain dark:block"
              aria-hidden
            />
            <span className="absolute bottom-[15%] left-1/2 z-10 -translate-x-1/2 text-xl font-bold tabular-nums text-muted drop-shadow-md dark:text-foreground sm:text-2xl">
              #{number}
            </span>
          </div>
        </div>
        {product.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-foreground px-3 py-1 text-xs font-medium uppercase tracking-wider text-background">
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
          <h3 className="text-base font-medium leading-tight sm:text-lg">{product.name}</h3>
          <p className="text-base font-medium tabular-nums sm:text-lg">${product.price.toFixed(2)}</p>
        </div>
        <p className="mt-1.5 text-base italic text-muted-foreground">
          {product.description}
        </p>
      </div>
    </motion.article>
  )
}
