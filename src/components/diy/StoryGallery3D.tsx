"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { DIY_STORIES } from "@/lib/constants/diy-stories";

export function StoryGallery3D() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {DIY_STORIES.map((story, i) => (
        <Link
          key={story.id}
          href={`/diy/${story.id}`}
          className="no-underline"
          onMouseEnter={() => setHoveredId(story.id)}
          onMouseLeave={() => setHoveredId(null)}
          onTouchStart={() => setHoveredId(story.id)}
          onTouchEnd={() => setHoveredId(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{
              delay: 0.15 + i * 0.08,
              duration: 0.5,
              type: "spring",
              stiffness: 200,
              damping: 20,
            }}
            whileTap={{ scale: 0.96 }}
            className="relative rounded-2xl overflow-hidden"
            style={{
              perspective: "800px",
              transformStyle: "preserve-3d",
              boxShadow: hoveredId === story.id
                ? `0 16px 40px ${story.accent}30, 0 4px 12px rgba(0,0,0,0.1)`
                : "0 4px 16px rgba(0,0,0,0.08)",
              transition: "box-shadow 0.3s ease",
            }}
          >
            {/* Cover image */}
            <div className="relative aspect-[3/4] overflow-hidden">
              <Image
                src={story.thumbnail}
                alt={`${story.title} 표지`}
                fill
                className="object-cover"
                sizes="(max-width: 430px) 50vw, 200px"
                loading={i < 2 ? "eager" : "lazy"}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              {/* Gradient overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to top, ${story.accent}CC 0%, ${story.accent}40 35%, transparent 60%)`,
                }}
              />
              {/* 3D book spine effect on left edge */}
              <div
                className="absolute left-0 top-0 bottom-0 w-2"
                style={{
                  background: `linear-gradient(to right, ${story.accent}60, transparent)`,
                }}
              />
            </div>

            {/* Title area */}
            <div
              className="absolute bottom-0 inset-x-0 p-3"
              style={{ zIndex: 2 }}
            >
              <h3 className="font-serif text-[13px] font-bold text-white leading-tight drop-shadow-sm">
                {story.title}
              </h3>
              <p className="text-white/70 text-[10px] font-light mt-0.5 line-clamp-1">
                {story.description}
              </p>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="text-[9px] text-white/50">{story.images.length}장</span>
                <span className="text-white/30 text-[9px]">|</span>
                <span className="text-[9px] text-white/50">무료</span>
              </div>
            </div>

            {/* "FREE" badge */}
            <div
              className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-medium"
              style={{
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(8px)",
                color: "white",
              }}
            >
              FREE
            </div>
          </motion.div>
        </Link>
      ))}
    </div>
  );
}
