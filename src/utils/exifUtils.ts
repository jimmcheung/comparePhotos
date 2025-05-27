/**
 * 将快门速度从小数形式转换为分数形式
 * @param exposureTime 快门速度（秒）
 * @returns 格式化后的快门速度字符串
 */
export const formatShutterSpeed = (exposureTime: string | number): string => {
  // 如果是字符串，先转换为数字
  const time = typeof exposureTime === 'string' ? parseFloat(exposureTime) : exposureTime;
  
  // 处理特殊情况
  if (time === 0 || isNaN(time)) return '0s';
  if (time === 1) return '1s';
  
  // 如果大于1秒，直接显示
  if (time >= 1) return `${time}s`;
  
  // 将小数转换为分数
  // 常见的快门速度分母
  const commonDenominators = [2, 4, 8, 15, 30, 60, 125, 250, 500, 1000, 2000, 4000, 8000];
  
  // 找到最接近的分母
  const matchedDenominator = commonDenominators.find(d => Math.abs(1/d - time) < 0.0001);
  
  if (matchedDenominator) {
    return `1/${matchedDenominator}s`;
  }
  
  // 如果没有找到匹配的常见分母，使用精确的分数表示
  const fraction = time.toFixed(6);
  const [whole, decimal] = fraction.split('.');
  const decimalPart = decimal.replace(/0+$/, '');
  const decimalDenominator = Math.pow(10, decimalPart.length);
  const numerator = parseInt(decimalPart);
  
  // 简化分数
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  const divisor = gcd(numerator, decimalDenominator);
  const simplifiedNumerator = numerator / divisor;
  const simplifiedDenominator = decimalDenominator / divisor;
  
  return `${simplifiedNumerator}/${simplifiedDenominator}s`;
}; 