import * as d3 from 'd3';
import { project_directory } from './main';

export const getData = async (name, fileType) => {
  if (window.cacheData && window.cacheData.has(name)) {
    console.log(`I have cached data for ${name}!`);
    return window.cacheData.get(name);
  }

  try {
    const filePath = `${project_directory}/${name}.${fileType}`;
    const file = await fetchFile(filePath, fileType);
    return file;
  } catch (e) {
    try {
      const filePath = `${project_directory}/../${name}.${fileType}`;
      const file = await fetchFile(filePath, fileType);
      return file;
    } catch (e) {
      console.log(e);
      return '';
    }
  }
};

const fetchFile = async (filePath, fileType) => {
  switch (fileType) {
    case 'txt':
    case 'csv':
      return  d3.text(filePath);
    case 'json':
      return  d3.json(filePath);
    default: {
      return Promise.reject(`Sorry, currently no support for fileType '${fileType}'!`);
    }
  }
}

export const addData = (key, value) => {
  window.cacheData.set(key, value);
};
