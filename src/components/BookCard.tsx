'use client';

import React, { useState } from 'react';
import { BookOpen, Trash2 } from 'lucide-react';

interface BookCardProps {
  id: string;
  title: string;
  author?: string | null;
  edition?: string | null;
  coverColor?: string | null;
  coverImageUrl?: string | null;
  totalRecipes?: number;
  spineSnippet?: string | null;
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  onIndexUpdated?: () => void;
}

export function BookCard({
  id,
  title,
  author,
  edition,
  coverColor = '#991b1b',
  coverImageUrl,
  totalRecipes = 0,
  onClick,
  onDelete,
}: BookCardProps) {
  const [imageError, setImageError] = useState(false);

  const bgGrad = `linear-gradient(145deg, ${coverColor || '#991b1b'} 0%, #150a0a 100%)`;
  const showRealCover = coverImageUrl && !imageError;

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-xl overflow-hidden book-shadow transition-all duration-300 book-spine bg-charcoal-900 select-none text-white aspect-[3/4] p-4 sm:p-5 flex flex-col justify-between"
      style={{
        background: showRealCover ? '#1c1917' : bgGrad,
      }}
    >
      {/* Real High-Res Cover Image */}
      {showRealCover && (
        <>
          <img
            src={coverImageUrl}
            alt={title}
            onError={() => setImageError(true)}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {/* Hover highlight overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </>
      )}

      {/* Fallback Texture overlay */}
      {!showRealCover && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />
      )}

      {/* Delete button (Top Right, on hover) */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(e);
          }}
          title="Delete cookbook from library"
          className="absolute top-2.5 right-2.5 z-20 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-white/90 hover:text-white transition-all transform hover:scale-110 shadow-md"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Fallback Cover Typography (Only rendered when cover image is absent) */}
      {!showRealCover ? (
        <div className="relative z-10 my-auto text-center px-2 py-4">
          <h3 className="font-serif text-lg sm:text-xl font-bold leading-tight drop-shadow-lg text-white">
            {title}
          </h3>
          {author && (
            <p className="text-xs sm:text-sm font-serif italic text-red-100/95 mt-2 drop-shadow-md">
              By {author}
            </p>
          )}
        </div>
      ) : (
        <div className="my-auto" />
      )}

      {/* Consistent Recipe Count Badge (Always in exact bottom-left position on all books) */}
      <div className="absolute bottom-3 left-3 z-20">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full text-white shadow-md border border-white/10">
          <BookOpen className="w-3 h-3 text-red-300" />
          {totalRecipes} Recipes
        </span>
      </div>
    </div>
  );
}
