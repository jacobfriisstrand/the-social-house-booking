Source: https://resend.com/docs/api-reference/emails/cancel-email
Fetched: 2026-08-24

---

# Cancel Email

Cancel a scheduled email.

`POST /emails/:id/cancel`

## Path Parameters

**id** (string, required)
The Email ID.

## Request Examples

**Node.js**
```ts
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

const { data, error } = await resend.emails.cancel(
  '49a3999c-0ce1-4ea6-ab68-afcd6dc2e794',
);
```

**PHP**
```php
$resend = Resend::client('re_xxxxxxxxx');

$resend->emails->cancel('49a3999c-0ce1-4ea6-ab68-afcd6dc2e794');
```

**Python**
```python
import resend

resend.api_key = "re_xxxxxxxxx"
resend.Emails.cancel(email_id="49a3999c-0ce1-4ea6-ab68-afcd6dc2e794")
```

**Ruby**
```ruby
require "resend"

Resend.api_key = "re_xxxxxxxxx"

Resend::Emails.cancel("49a3999c-0ce1-4ea6-ab68-afcd6dc2e794")
```

**Go**
```go
package main

import (
	"fmt"

	"github.com/resend/resend-go/v3"
)

func main() {
	client := resend.NewClient("re_xxxxxxxxx")

	canceled, err := client.Emails.Cancel("49a3999c-0ce1-4ea6-ab68-afcd6dc2e794")
	if err != nil {
		panic(err)
	}
	fmt.Println(canceled.Id)
}
```

**Rust**
```rust
use resend_rs::{Resend, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let resend = Resend::new("re_xxxxxxxxx");

  let _canceled = resend
    .emails
    .cancel("49a3999c-0ce1-4ea6-ab68-afcd6dc2e794")
    .await?;

  Ok(())
}
```

**Java**
```java
import com.resend.*;

public class Main {
    public static void main(String[] args) {
        Resend resend = new Resend("re_xxxxxxxxx");

        CancelEmailResponse canceled = resend
          .emails()
          .cancel("49a3999c-0ce1-4ea6-ab68-afcd6dc2e794");
    }
}
```

**.NET**
```csharp
using Resend;

IResend resend = ResendClient.Create( "re_xxxxxxxxx" ); // Or from DI

await resend.EmailCancelAsync( new Guid( "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" ) );
```

**cURL**
```bash
curl -X POST 'https://api.resend.com/emails/49a3999c-0ce1-4ea6-ab68-afcd6dc2e794/cancel' \
     -H 'Authorization: Bearer re_xxxxxxxxx' \
     -H 'Content-Type: application/json'
```

**CLI**
```bash
resend emails cancel 49a3999c-0ce1-4ea6-ab68-afcd6dc2e794
```

## Response Example

```json
{
  "object": "email",
  "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794"
}
```
