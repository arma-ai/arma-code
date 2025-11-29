'use server';

/**
 * Тестовая функция для проверки конвертации кодировки
 * Можно вызвать из консоли браузера или через API
 */
export async function testEncodingConversion() {
  // Пример неправильно закодированного текста
  const badText = 'Èíôîðìàòèêà';
  const expectedText = 'Информатика';
  
  try {
    const iconv = require('iconv-lite');
    
    // Метод 1: latin1
    const method1 = iconv.decode(Buffer.from(badText, 'latin1'), 'win1251');
    console.log('Method 1 (latin1):', method1);
    
    // Метод 2: binary
    const method2 = iconv.decode(Buffer.from(badText, 'binary'), 'win1251');
    console.log('Method 2 (binary):', method2);
    
    // Метод 3: utf8 -> win1251 (неправильный, но для теста)
    const method3 = iconv.decode(Buffer.from(badText, 'utf8'), 'win1251');
    console.log('Method 3 (utf8):', method3);
    
    return {
      original: badText,
      method1,
      method2,
      method3,
      expected: expectedText,
      method1Match: method1 === expectedText,
      method2Match: method2 === expectedText,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


