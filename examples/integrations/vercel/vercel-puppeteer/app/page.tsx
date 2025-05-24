import UrlExporter from './components/UrlExporter';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col ">
      <div className="flex-1 flex flex-col sm:mt-80 mt-24">
        <div className="w-full max-w-screen-xl px-8 sm:px-20 mx-auto">
          <main className="flex flex-col items-center gap-8">
            <h1 className="text-2xl font-bold">URL Content Exporter</h1>
            <UrlExporter />
          </main>
        </div>
      </div>
      
      <footer className="text-center text-sm text-foreground/60 pb-8">
        Choose a URL and export format to get started
      </footer>
    </div>
  );
}
