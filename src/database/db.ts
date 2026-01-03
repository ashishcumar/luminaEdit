import Dexie, { type Table } from 'dexie';

export interface VideoAsset {
  id: string;      
  name: string;    
  data: File;      
  thumbnail?: string;
}

export class MyDatabase extends Dexie {
  assets!: Table<VideoAsset>;

  constructor() {
    super('VideoEditorDB');
    this.version(1).stores({
      assets: 'id, name' 
    });
  }
}

export const db = new MyDatabase();