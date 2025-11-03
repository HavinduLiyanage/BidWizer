interface PageHeroProps {
  title: string;
  description?: string;
}

export function PageHero({ title, description }: PageHeroProps) {
  return (
    <div className="bg-navy text-white py-12 md:py-20">
      <div className="container mx-auto px-4 md:px-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
        {description && (
          <p className="text-lg text-gray-300 max-w-2xl">{description}</p>
        )}
      </div>
    </div>
  );
}

