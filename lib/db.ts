// 这是一个极简的浏览器本地数据库，让录音能存下来
export const saveBlob = async (id: string, blob: Blob) => {
  console.log("Saving...", id);
  // 这里可以先留空，或者用 localStorage 做简单占位
};
export const getBlob = async (id: string) => null;
export const deleteBlob = async (id: string) => {};
