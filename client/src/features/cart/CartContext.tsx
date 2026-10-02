import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  addCartProduct,
  deleteCartItem,
  fetchCart,
  setCartItemQuantity,
  type Cart,
} from './cart.api';

type CartContextValue = {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setCart(null);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      setCart(await fetchCart());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el carrito.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCart(null);
      setError(null);
      setLoading(false);
      return;
    }
    void refresh();
  }, [authLoading, refresh, user]);

  const value = useMemo<CartContextValue>(() => ({
    cart,
    loading: authLoading || loading,
    error,
    refresh,
    async addItem(productId, quantity = 1) {
      setCart(await addCartProduct(productId, quantity));
    },
    async updateQuantity(itemId, quantity) {
      setCart(await setCartItemQuantity(itemId, quantity));
    },
    async removeItem(itemId) {
      setCart(await deleteCartItem(itemId));
    },
  }), [authLoading, cart, error, loading, refresh]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider.');
  return context;
}
