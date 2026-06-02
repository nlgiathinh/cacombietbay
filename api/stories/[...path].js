const supabase = require('../_supabase');

const serializeStory = (story) => ({
  id: story.id,
  title: story.title,
  author: story.author,
  description: story.description,
  cover_path: story.cover_path,
  status: story.status,
  genre: story.genre,
  created_at: story.created_at
});

module.exports = async (req, res) => {
  const path = req.query.path || [];
  const parts = Array.isArray(path) ? path : [path];
  const storyId = parts[0];
  const isChapters = parts[1] === 'chapters';

  try {
    if (req.method === 'GET' && parts.length === 0) {
      const { data: stories, error: storiesError } = await supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false });
      if (storiesError) throw storiesError;

      const { data: chapters, error: chaptersError } = await supabase
        .from('chapters')
        .select('story_id, views');
      if (chaptersError) throw chaptersError;

      const storyStats = stories.map(story => {
        const storyChapters = chapters.filter(c => c.story_id === story.id);
        const avgViews = storyChapters.length > 0 
          ? storyChapters.reduce((acc, c) => acc + (c.views || 0), 0) / storyChapters.length 
          : 0;
        return { ...story, avgViews };
      });

      const hotThreshold = 10; // Example threshold
      const ongoingStories = storyStats.filter(s => s.status === 'ongoing');
      const hotStories = ongoingStories
        .sort((a, b) => b.avgViews - a.avgViews)
        .slice(0, 5)
        .map(s => s.id);

      return res.status(200).json(storyStats.map(s => ({
        ...serializeStory(s),
        avgViews: s.avgViews,
        is_hot: hotStories.includes(s.id)
      })));
    }

    if (req.method === 'GET' && parts.length === 1) {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('id', storyId)
        .limit(1)
        .single();

      if (error) {
        return res.status(404).json({ error: 'Story not found' });
      }
      return res.status(200).json(serializeStory(data));
    }

    if (req.method === 'GET' && parts.length === 2 && isChapters) {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('story_id', storyId)
        .order('chapter_number', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST' && parts.length === 0) {
      const { title, author, description, cover_path, status, genre } = req.body || {};
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const { data, error } = await supabase
        .from('stories')
        .insert([
          {
            title,
            author,
            description,
            cover_path: cover_path || '',
            status: status || 'ongoing',
            genre: genre || ''
          }
        ])
        .select('id')
        .single();

      if (error) throw error;
      return res.status(201).json({ id: data.id, message: 'Story added successfully' });
    }

    if (req.method === 'PUT' && parts.length === 1) {
      const { title, author, description, cover_path, status, genre } = req.body || {};
      const updates = {
        title,
        author,
        description,
        cover_path,
        status,
        genre
      };
      Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

      const { error } = await supabase
        .from('stories')
        .update(updates)
        .eq('id', storyId);

      if (error) throw error;
      return res.status(200).json({ message: 'Story updated successfully' });
    }

    if (req.method === 'DELETE' && parts.length === 1) {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);
      if (error) throw error;
      return res.status(200).json({ message: 'Story deleted successfully' });
    }

    return res.status(404).json({ error: 'Route not found' });
  } catch (error) {
    console.error('stories handler error', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};
