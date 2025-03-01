'use client';

import React, { useState, useEffect } from 'react';
import { testApiConnection, testAuthenticatedApi } from '../utils/api-tester';
import apiService from '../services/api.service';

const ApiConnectionTester: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // ตรวจสอบว่ามี token หรือไม่เมื่อโหลดคอมโพเนนต์
    setIsAuthenticated(apiService.hasAuthToken());
  }, []);

  const handleTestConnection = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const testResults = await testApiConnection();
      setResults(testResults);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการทดสอบ: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAuthenticated = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const testResults = await testAuthenticatedApi();
      setResults(testResults);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการทดสอบ: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">ทดสอบการเชื่อมต่อ API</h2>
      
      <div className="mb-4">
        <p className="text-gray-600 dark:text-gray-300 mb-2">
          ใช้เครื่องมือนี้เพื่อตรวจสอบการเชื่อมต่อระหว่าง Frontend และ Backend API
        </p>
        
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={handleTestConnection}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อทั่วไป'}
          </button>
          
          <button
            onClick={handleTestAuthenticated}
            disabled={isLoading || !isAuthenticated}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'กำลังทดสอบ...' : 'ทดสอบ API ที่ต้องยืนยันตัวตน'}
          </button>
        </div>
        
        {!isAuthenticated && (
          <div className="mb-4 p-2 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-md">
            ยังไม่ได้เข้าสู่ระบบ ไม่สามารถทดสอบ API ที่ต้องยืนยันตัวตนได้
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md">
            {error}
          </div>
        )}
        
        {results && (
          <div className="mt-4">
            <div className={`p-2 rounded-md ${results.success ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'}`}>
              <p className="font-medium">
                สถานะโดยรวม: {results.success ? 'เชื่อมต่อสำเร็จ' : 'เชื่อมต่อล้มเหลว'}
              </p>
            </div>
            
            <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      API
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      สถานะ
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      ข้อความ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {Object.entries(results.results).map(([key, value]: [string, any]) => (
                    <tr key={key}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {key}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${value.success ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                          {value.success ? 'สำเร็จ' : 'ล้มเหลว'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {value.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4">
              <details className="border border-gray-200 dark:border-gray-700 rounded-md">
                <summary className="px-4 py-2 bg-gray-50 dark:bg-gray-800 cursor-pointer">
                  รายละเอียดเพิ่มเติม
                </summary>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 overflow-x-auto">
                  <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiConnectionTester;