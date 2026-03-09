export const useGenerateId = (): string => {
    const symbols = "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    let id: string = "";

    for(let i = 0; i<10 ;i++){
      id+=symbols[Math.floor(Math.random() * symbols.length)];
    }

    return id
}