import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { api } from '../utils/api';

interface PhotoUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
}

export function PhotoUpload({
  value,
  onChange,
  label = '上传照片',
  placeholder = '点击或拖拽上传照片',
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }

    try {
      setUploading(true);
      const url = await api.uploadPhoto(file);
      onChange(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      
      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt="上传的照片"
            className="w-full h-48 object-cover rounded-lg border border-gray-200"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={handleClick}
          className={`border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50 ${
            uploading ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-2 text-sm text-gray-500">上传中...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="w-10 h-10 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">{placeholder}</p>
              <p className="text-xs text-gray-400 mt-1">支持 JPG、PNG 格式，最大 10MB</p>
            </div>
          )}
        </div>
      )}
      
      {!value && (
        <div className="flex gap-2 mt-2">
          {['https://picsum.photos/400/300?random=1', 'https://picsum.photos/400/300?random=2'].map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(url)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
            >
              <ImageIcon className="w-3 h-3" />
              使用示例图片{i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
