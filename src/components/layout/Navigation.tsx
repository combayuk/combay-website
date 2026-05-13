"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Search, ShoppingCart, X } from "lucide-react";
import { readCartLines } from "@/lib/cart";
import { PUBLIC_CATEGORY_GROUPS } from "@/lib/categoryTaxonomy";

const FALLBACK_SHOP_CATS = PUBLIC_CATEGORY_GROUPS.map((group) => ({
  name: group.label,
  slug: group.slug,
  image: group.image,
  items: group.subcategories.map((item) => ({
    name: item.label,
    slug: item.slug,
  })),
}));

type ShopMenuCategory = {
  name: string;
  slug: string;
  image?: string;
  items: { name: string; slug: string }[];
};

const NAV = [
  { label: "Asset Recovery", href: "/asset-recovery" },
  { label: "Repairs", href: "/repair" },
  { label: "Manufacturers", href: "/manufacturers" },
  { label: "Resources", href: "/resources" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

function WAIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="block h-4 w-4 shrink-0 align-middle"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26C2.168 6.443 6.603 2.009 12.055 2.009c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function usableImage(src?: string) {
  if (!src) return "/images/categories/real/electrical-components.svg";
  if (
    src.startsWith("/") ||
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:image")
  )
    return src;
  return "/images/categories/real/electrical-components.svg";
}

function shopCategoryHref(slug?: string) {
  return slug ? `/shop?category=${encodeURIComponent(slug)}` : "/shop";
}

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [megaSearch, setMegaSearch] = useState("");
  const [megaSearchError, setMegaSearchError] = useState(false);
  const [shopCats, setShopCats] =
    useState<ShopMenuCategory[]>(FALLBACK_SHOP_CATS);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const syncCart = () =>
      setCartCount(readCartLines().reduce((sum, line) => sum + line.qty, 0));
    syncCart();
    window.addEventListener("storage", syncCart);
    window.addEventListener("combay-cart-updated", syncCart as EventListener);
    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener(
        "combay-cart-updated",
        syncCart as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories/public", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (cancelled || !Array.isArray(result?.categories)) return;
        const mapped = result.categories
          .filter((cat: any) => cat?.slug)
          .map((cat: any) => ({
            name: String(cat.label || cat.name || cat.slug),
            slug: String(cat.slug),
            image:
              cat.image || "/images/categories/real/electrical-components.svg",
            items: Array.isArray(cat.subcategories)
              ? cat.subcategories.map((item: any) => ({
                    name: String(item.label || item.name || item.slug),
                    slug: String(item.slug),
                  }))
              : [],
          }));
        if (mapped.length) setShopCats(mapped);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, []);

  const openShop = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setShopOpen(true);
  };
  const closeShop = () => {
    closeTimer.current = setTimeout(() => setShopOpen(false), 140);
  };

  function dispatchShopUrlChange(nextUrl: string) {
    window.history.pushState({}, "", nextUrl);
    window.dispatchEvent(new CustomEvent("combay-shop-url-change"));
  }

  function handleShopCategoryClick(
    event: MouseEvent<HTMLAnchorElement>,
    slug?: string,
  ) {
    setShopOpen(false);
    setMobileOpen(false);
    if (pathname !== "/shop" || typeof window === "undefined") return;
    event.preventDefault();
    dispatchShopUrlChange(shopCategoryHref(slug));
  }

  function handleMegaSearchSubmit(event: FormEvent<HTMLFormElement>) {
    const value = megaSearch.trim();
    if (!value) {
      event.preventDefault();
      setMegaSearchError(true);
      return;
    }
    setShopOpen(false);
    if (pathname === "/shop" && typeof window !== "undefined") {
      event.preventDefault();
      dispatchShopUrlChange(`/shop?q=${encodeURIComponent(value)}`);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/95">
      <div className="site-shell">
        <div className="flex h-[64px] items-center justify-between gap-3">
          <Link
            href="/"
            className="group flex flex-shrink-0 items-center"
            aria-label="Combay home"
          >
            <img
              src="/images/combay-logo.svg"
              alt="Combay"
              className="h-9 w-auto max-w-[165px] object-contain"
            />
          </Link>

          <nav className="hidden h-full items-center lg:flex">
            <div
              className="relative flex h-full items-center"
              onMouseEnter={openShop}
              onMouseLeave={closeShop}
            >
              <button className="flex h-full items-center gap-1.5 border-b-2 border-transparent px-4 text-sm font-800 text-slate-700 transition-colors hover:border-[#E8A44A] hover:text-[#2D4F7A]">
                Shop{" "}
                <ChevronDown
                  size={14}
                  className={`transition-transform ${shopOpen ? "rotate-180" : ""}`}
                />
              </button>
              {shopOpen && (
                <div
                  className="fixed left-1/2 top-[64px] z-[70] w-[min(1120px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-b-xl border border-slate-200 bg-white shadow-2xl"
                  onMouseEnter={openShop}
                  onMouseLeave={closeShop}
                >
                  <form
                    action="/shop"
                    method="get"
                    onSubmit={handleMegaSearchSubmit}
                    className="border-b border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label
                        className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-xs font-800 text-slate-500 shadow-sm focus-within:border-[#E8A44A] ${megaSearchError ? "border-red-500 ring-2 ring-red-100" : "border-slate-200"}`}
                      >
                        <Search
                          size={14}
                          className="flex-shrink-0 text-[#C9872F]"
                        />
                        <input
                          name="q"
                          value={megaSearch}
                          onChange={(event) => {
                            setMegaSearch(event.target.value);
                            if (event.target.value.trim())
                              setMegaSearchError(false);
                          }}
                          placeholder="Search by SKU, MPN, model, manufacturer or product name"
                          className="min-w-0 flex-1 bg-transparent text-[13px] font-700 text-[#2D4F7A] outline-none placeholder:text-slate-400"
                        />
                      </label>
                      <button
                        type="submit"
                        className="btn-primary whitespace-nowrap px-3 py-1.5 text-[11px]"
                      >
                        Search stock
                      </button>
                      <Link
                        href="/shop"
                        onClick={(event) => handleShopCategoryClick(event, "")}
                        className="btn-secondary whitespace-nowrap px-3 py-1.5 text-[11px]"
                      >
                        Browse all
                      </Link>
                    </div>
                    {megaSearchError ? (
                      <p className="mt-1 pl-1 text-[11px] font-800 text-red-600">
                        Please type something.
                      </p>
                    ) : null}
                  </form>

                  <div className="grid max-h-[calc(100vh-116px)] grid-cols-4 gap-px overflow-hidden bg-slate-100 p-px">
                    {shopCats.map((cat) => (
                      <div
                        key={cat.slug}
                        className="group min-h-[104px] bg-white p-2 transition-colors hover:bg-slate-50"
                      >
                        <Link
                          href={shopCategoryHref(cat.slug)}
                          onClick={(event) =>
                            handleShopCategoryClick(event, cat.slug)
                          }
                          className="mb-1.5 flex items-center gap-1.5"
                        >
                          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-slate-50">
                            <img
                              src={usableImage(cat.image)}
                              onError={(event) => {
                                event.currentTarget.src =
                                  "/images/categories/real/electrical-components.svg";
                              }}
                              alt=""
                              className="h-6 w-6 object-contain"
                            />
                          </span>
                          <span className="font-display text-[12px] font-900 leading-tight text-[#2D4F7A] group-hover:text-[#C9872F]">
                            {cat.name}
                          </span>
                        </Link>
                        <ul className="grid gap-0.5 pl-8">
                          {cat.items.map((item) => (
                            <li key={item.slug}>
                              <Link
                                href={shopCategoryHref(item.slug)}
                                onClick={(event) =>
                                  handleShopCategoryClick(event, item.slug)
                                }
                                className="block truncate text-[10.5px] leading-3.5 text-slate-500 hover:text-[#2D4F7A]"
                              >
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-full items-center border-b-2 border-transparent px-3 text-sm font-800 text-slate-700 transition-colors hover:border-[#E8A44A] hover:text-[#2D4F7A]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/cart"
              className="relative rounded-md border border-slate-200 p-2.5 text-slate-600 transition-colors hover:border-slate-400 hover:text-[#2D4F7A]"
              aria-label="Cart"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E8A44A] px-1 text-[10px] font-900 text-[#2D4F7A]">
                  {cartCount}
                </span>
              )}
            </Link>
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP ?? "447340383334"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-md border border-[#25D366]/50 px-3 py-2 text-sm font-800 leading-none text-[#128C4A] transition-colors hover:bg-[#25D366] hover:text-white"
            >
              <WAIcon /> WhatsApp
            </a>
            <Link
              href="/repair"
              className="rounded-md bg-[#2D4F7A] px-3.5 py-2 text-sm font-900 text-white transition-colors hover:bg-[#355F8E]"
            >
              Request Repair
            </Link>
          </div>

          <button
            className="rounded-md border border-slate-200 p-2.5 text-[#2D4F7A] lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <div className="site-shell py-3">
            <div className="grid gap-2">
              <Link
                href="/shop"
                onClick={(event) => handleShopCategoryClick(event, "")}
                className="rounded-lg bg-slate-50 px-3 py-2.5 font-900 text-[#2D4F7A]"
              >
                Shop equipment
              </Link>
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-800 text-slate-700 hover:bg-slate-50"
                >
                  {item.label}
                </Link>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link href="/cart" className="btn-secondary">
                  Cart {cartCount ? `(${cartCount})` : ""}
                </Link>
                <Link href="/contact" className="btn-primary">
                  Get quote
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
