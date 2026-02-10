public class AccountController {
    
    public static void createAccount(String accountName) {
        System.debug('Creating account: ' + accountName);
        
        Account acc = new Account();
        acc.Name = accountName;
        
        insert acc;
        
        System.debug('Account created with ID: ' + acc.Id);  
    }
    
    public static List<Account> searchAccounts(String searchTerm) {
        String query = 'SELECT Id, Name FROM Account WHERE Name LIKE \'%' + searchTerm + '%\'';
        return Database.query(query);
    }
    
    public static void updateAccountRevenue(Id accountId, Decimal revenue) {
        Account acc = [SELECT Id, AnnualRevenue FROM Account WHERE Id = :accountId];
        acc.AnnualRevenue = revenue;
        update acc;
    }
    
    public static void deleteOldAccounts() {
        List<Account> oldAccounts = [SELECT Id FROM Account WHERE CreatedDate < LAST_YEAR];
        delete oldAccounts;
    }
    
    public static Integer calculateComplexScore(Integer value) {
        if (value > 100) {
            if (value > 200) {
                if (value > 300) {
                    return value * 3;
                } else {
                    return value * 2;
                }
            } else {
                return value * 1.5;
            }
        } else {
            return value;
        }
    }
}

