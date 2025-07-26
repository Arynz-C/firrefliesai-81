import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { searchAndFetchContent, getWebpageContent } from '@/utils/ragUtils';
import { Clock, Zap, Search } from 'lucide-react';

export const RAGDemo = () => {
  const [query, setQuery] = useState('');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{url: string, content: string}[]>([]);
  const [timing, setTiming] = useState<number>(0);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      const searchResults = await searchAndFetchContent(query);
      const endTime = Date.now();
      
      setResults(searchResults);
      setTiming(endTime - startTime);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWebScrape = async () => {
    if (!url.trim()) return;
    
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      const content = await getWebpageContent(url);
      const endTime = Date.now();
      
      if (content) {
        setResults([{ url, content }]);
        setTiming(endTime - startTime);
      }
    } catch (error) {
      console.error('Scraping error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Optimized RAG Demo - Client-Side Only
          </CardTitle>
          <CardDescription>
            Semua proses web scraping sekarang berjalan di browser (client-side) untuk performa lebih cepat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Demo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search & Fetch (Parallel Processing)</label>
            <div className="flex gap-2">
              <Input
                placeholder="Masukkan query pencarian..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isLoading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {/* Web Scraping Demo */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Direct Web Scraping</label>
            <div className="flex gap-2">
              <Input
                placeholder="Masukkan URL website..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleWebScrape()}
              />
              <Button onClick={handleWebScrape} disabled={isLoading}>
                <Zap className="h-4 w-4 mr-2" />
                Scrape
              </Button>
            </div>
          </div>

          {/* Performance Results */}
          {timing > 0 && (
            <Card className="bg-green-50 dark:bg-green-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">
                    Completed in {timing}ms - Optimized Client-Side Processing!
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Results ({results.length})</h3>
              {results.map((result, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm truncate">
                      {result.url}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {result.content.substring(0, 200)}...
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Content length: {result.content.length} characters
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {isLoading && (
            <Card className="bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="text-blue-700 dark:text-blue-300">
                  Processing... Using optimized client-side scraping
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <CardHeader>
          <CardTitle className="text-lg">🚀 Optimizations Applied</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>✅ <strong>Parallel Processing:</strong> Search dan content fetching dilakukan bersamaan</div>
          <div>✅ <strong>Client-Side Only:</strong> Tidak ada dependency ke Supabase Edge Functions</div>
          <div>✅ <strong>Optimized Timeouts:</strong> 8-10 detik timeout untuk request yang cepat</div>
          <div>✅ <strong>Smart Content Extraction:</strong> Algoritma extraction yang lebih efisien</div>
          <div>✅ <strong>Error Handling:</strong> Graceful fallback jika website tidak bisa diakses</div>
          <div>✅ <strong>Resource Management:</strong> Automatic cleanup dan memory optimization</div>
        </CardContent>
      </Card>
    </div>
  );
};