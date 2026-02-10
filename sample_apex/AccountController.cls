/**
 * Sample Apex class with various code violations
 * This file is used to demonstrate the static analysis tool
 */
public class AccountController {
    
    // Missing CRUD/FLS checks
    public static List<Account> getAllAccounts() {
        System.debug('Fetching all accounts');  // Debug statement
        return [SELECT Id, Name, Industry FROM Account];
    }
    
    // Missing CRUD check before DML
    public static void createAccount(String accountName) {
        Account acc = new Account(Name = accountName);
        insert acc;
    }
    
    // Missing CRUD check
    public static void updateAccountIndustry(Id accountId, String industry) {
        Account acc = [SELECT Id FROM Account WHERE Id = :accountId];
        acc.Industry = industry;
        System.debug('Updating account: ' + accountId);   
        update acc;
    }
    
    // Method with high cognitive complexity
    public static String processAccount(Account acc) {
        if (acc != null) {
            if (acc.Industry != null) {
                if (acc.Industry == 'Technology') {
                    if (acc.AnnualRevenue > 1000000) {
                        return 'Premium Tech Account';
                    } else if (acc.AnnualRevenue > 500000) {
                        return 'Standard Tech Account';
                    } else {
                        return 'Small Tech Account';
                    }
                }
            }
        }
        return 'Unknown';
    }
}
