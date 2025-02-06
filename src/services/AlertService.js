/**This module alerts the user when an error occurs.
* @module AlertService
*/
import dotenv from 'dotenv'
dotenv.config()
export default { alert }

function alert(content) {
    //TODO: send an email to the user
    console.log("Alert: ", content)
}