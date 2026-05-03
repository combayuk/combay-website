import TopBar from "@/components/TopBar";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
export default function Page() {
  return (
    <main><TopBar /><Navigation />
    <section className="py-20 text-center">
      <p className="font-mono text-xs tracking-widest uppercase text-accent mb-3">Coming Soon</p>
      <h1 className="font-display font-800 text-4xl text-navy-900 capitalize">portal</h1>
      <p className="text-gray-500 mt-3">This page is under construction.</p>
    </section>
    <Footer /></main>
  );
}
