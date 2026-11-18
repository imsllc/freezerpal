import React from "react";
import { SvgXml } from "react-native-svg";
import type { Category } from "../core/model";
import icons from "../data/foodIcons.json";

// Flat food icons use solid fills; prepared meals have a custom plate illustration.
const illustrations: Record<Category, string> = {
  Meat: icons.meat,
  Vegetables: icons.vegetables,
  Fruit: icons.fruit,
  "Prepared meals": icons.meal,
  Bread: icons.bread,
  Seafood: icons.seafood,
  Dairy: icons.dairy,
  Other: icons.other,
};

export function CategoryIcon({
  category,
  size = 32,
}: {
  category: Category;
  size?: number;
}) {
  return (
    <SvgXml
      xml={illustrations[category]}
      width={size}
      height={size}
      accessible
      accessibilityLabel={category}
    />
  );
}
