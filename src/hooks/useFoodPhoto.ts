import { useEffect, useState } from "react";
import { openRepository } from "../data/database";

export function useFoodPhoto(photoId: string | null) {
  const [photo, setPhoto] = useState<{ id: string; uri: string | null }>();
  useEffect(() => {
    if (!photoId) return;
    let active = true;
    void openRepository()
      .then((repo) => repo.loadPhoto(photoId))
      .then((uri) => {
        if (active) setPhoto({ id: photoId, uri });
      })
      .catch(() => {
        if (active) setPhoto({ id: photoId, uri: null });
      });
    return () => {
      active = false;
    };
  }, [photoId]);
  return photo?.id === photoId ? photo.uri : null;
}
