import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

const NewsCard = ({ newsArticles, loadingNews }) => {
  return (
    <Card className="premium-card gold-gradient-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-white section-title-gold" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Latest News
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loadingNews ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded w-full"></div>
                <div className="h-3 bg-[rgba(255,255,255,0.1)] rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : newsArticles?.length > 0 ? (
          <div className="space-y-3">
            {newsArticles.slice(0, 5).map((article, idx) => (
              <a
                key={idx}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-[rgba(255,255,255,0.02)] rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors group"
                data-testid={`news-article-${idx}`}
              >
                <div className="flex items-start gap-2">
                  <ExternalLink className="w-3 h-3 text-gray-500 mt-1 flex-shrink-0 group-hover:text-[#d946ef]" />
                  <div>
                    <h5 className="text-sm text-white font-medium line-clamp-2 group-hover:text-[#d946ef] transition-colors">
                      {article.title}
                    </h5>
                    <p className="text-xs text-gray-500 mt-1">
                      {article.publisher} • {article.published_date}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">No recent news available</p>
        )}
      </CardContent>
    </Card>
  );
};

export default NewsCard;
