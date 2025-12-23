import axios from "axios";

export default function ExternalRoutes(app) {
  const search = async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        res.status(400).json({ error: "Search query is required" });
        return;
      }

      const response = await axios.get(
        "https://api.unsplash.com/search/photos",
        {
          params: {
            query: q,
            per_page: 20,
            page: req.query.page || 1,
          },
          headers: {
            Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
          },
        }
      );

      const results = response.data.results.map((photo) => ({
        id: photo.id,
        $id: photo.id,
        description: photo.description || photo.alt_description || "",
        imageUrl: photo.urls.regular,
        thumbnailUrl: photo.urls.thumb,
        fullUrl: photo.urls.full,
        width: photo.width,
        height: photo.height,
        likes: photo.likes,
        createdAt: photo.created_at,
        user: {
          id: photo.user.id,
          name: photo.user.name,
          username: photo.user.username,
          imageUrl: photo.user.profile_image.medium,
        },
        links: {
          html: photo.links.html,
        },
      }));

      res.json({
        documents: results,
        total: response.data.total,
        total_pages: response.data.total_pages,
      });
    } catch (error) {
      if (error.response) {
        res.status(error.response.status).json({
          error: "Failed to search Unsplash",
          message: error.response.data?.errors?.[0] || "API error",
        });
      } else {
        res.status(500).json({ error: "Failed to search external API" });
      }
    }
  };
  app.get("/api/external/search", search);

  const getDetails = async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "Photo ID is required" });
        return;
      }

      const response = await axios.get(
        `https://api.unsplash.com/photos/${id}`,
        {
          headers: {
            Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
          },
        }
      );

      const photo = response.data;
      const result = {
        id: photo.id,
        $id: photo.id,
        description: photo.description || photo.alt_description || "",
        imageUrl: photo.urls.regular,
        thumbnailUrl: photo.urls.thumb,
        fullUrl: photo.urls.full,
        rawUrl: photo.urls.raw,
        width: photo.width,
        height: photo.height,
        likes: photo.likes,
        createdAt: photo.created_at,
        updatedAt: photo.updated_at,
        color: photo.color,
        user: {
          id: photo.user.id,
          name: photo.user.name,
          username: photo.user.username,
          imageUrl: photo.user.profile_image.medium,
          bio: photo.user.bio || "",
          location: photo.user.location || "",
          links: {
            html: photo.user.links.html,
          },
        },
        links: {
          html: photo.links.html,
          download: photo.links.download,
        },
        exif: photo.exif || {},
        location: photo.location || {},
        tags: photo.tags || [],
      };

      res.json(result);
    } catch (error) {
      if (error.response) {
        res.status(error.response.status).json({
          error: "Failed to get photo details",
          message: error.response.data?.errors?.[0] || "API error",
        });
      } else {
        res.status(500).json({ error: "Failed to get external API details" });
      }
    }
  };
  app.get("/api/external/details/:id", getDetails);

  return app;
}
