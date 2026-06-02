const supabase = require('../_supabase');

module.exports = async (req, res) => {
  const path = req.query.path || [];
  const parts = Array.isArray(path) ? path : [path];
  const chapterId = parts[0];
  const isView = parts[1] === 'view';

  try {
    if (req.method === 'GET' && parts.length === 1) {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('id', chapterId)
        .limit(1)
        .single();

      if (error) {
        return res.status(404).json({ error: 'Chapter not found' });
      }
      return res.status(200).json(data);
    }

    if (req.method === 'POST' && parts.length === 2 && isView) {
      const { data: current, error: readError } = await supabase
        .from('chapters')
        .select('id, views')
        .eq('id', chapterId)
        .limit(1)
        .single();

      if (readError) {
        return res.status(404).json({ error: 'Chapter not found' });
      }

      const newViews = (current.views || 0) + 1;
      const { error: updateError } = await supabase
        .from('chapters')
        .update({ views: newViews })
        .eq('id', chapterId);

      if (updateError) throw updateError;
      return res.status(200).json({ id: current.id, views: newViews });
    }

    if (req.method === 'PUT' && parts.length === 1) {
      const { chapter_number, title, content } = req.body || {};
      const updates = { chapter_number, title, content };
      Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

      const { error } = await supabase
        .from('chapters')
        .update(updates)
        .eq('id', chapterId);

      if (error) throw error;
      return res.status(200).json({ message: 'Chapter updated successfully' });
    }

    if (req.method === 'DELETE' && parts.length === 1) {
      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapterId);
      if (error) throw error;
      return res.status(200).json({ message: 'Chapter deleted successfully' });
    }

    return res.status(404).json({ error: 'Route not found' });
  } catch (error) {
    console.error('chapters handler error', error);
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};
