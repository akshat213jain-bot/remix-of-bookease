import Layout from "@/components/layout/Layout";
import { FavoriteProvidersPanel } from "@/components/favorites/FavoriteProvidersPanel";
import { Heart } from "lucide-react";

const Favorites = () => {
  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Heart className="h-8 w-8 text-red-500" />
          <div>
            <h1 className="text-3xl font-bold">My Favorites</h1>
            <p className="text-muted-foreground">
              Quick access to your preferred providers
            </p>
          </div>
        </div>

        <FavoriteProvidersPanel />
      </div>
    </Layout>
  );
};

export default Favorites;
