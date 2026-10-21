-- The resources of a ministry: the kind of a material (an id of the list of kinds, see materialKinds.ts),
-- and a link to a video of YouTube (a material of the kind 'video')
ALTER TABLE materials ADD COLUMN resource TEXT;
ALTER TABLE materials ADD COLUMN url TEXT;
