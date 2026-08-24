Source: https://resend.com/docs/dashboard/emails/schedule-email
Fetched: 2026-08-24

---

# Schedule Email

> Send emails at a specific time without additional complexity.

While some emails need to be delivered as soon as possible, like password resets or magic links, others can be scheduled for a specific time.

Here are some examples of when you might want to schedule an email:

* Send welcome email **5 minutes after** signup
* Trigger a reminder email **24 hours before** an event
* Schedule a weekly digest email for the **next day at 9am PST**

Before, you had to use external services to handle the scheduling logic, but now you can use the new Resend API to schedule emails.

> **Info:** Emails can be scheduled up to 30 days in advance.

There are two ways to schedule an email:

1. Using natural language
2. Using date format

## Schedule using natural language

You can use the various Resend SDKs to schedule emails.

The date can be defined using natural language, such as `"in 1 hour"`, `"tomorrow at 9am"`, or `"Friday at 3pm ET"`.

```ts
// Node.js
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['delivered@resend.dev'],
  subject: 'hello world',
  html: '<p>it works!</p>',
  scheduledAt: 'in 1 min',
});
```

```php
// PHP
$resend = Resend::client('re_xxxxxxxxx');

$resend->emails->send([
  'from' => 'Acme <onboarding@resend.dev>',
  'to' => ['delivered@resend.dev'],
  'subject' => 'hello world',
  'html' => '<p>it works!</p>',
  'scheduled_at' => 'in 1 min'
]);
```

```python
# Python
import resend

resend.api_key = "re_xxxxxxxxx"

params: resend.Emails.SendParams = {
  "from": "Acme <onboarding@resend.dev>",
  "to": ["delivered@resend.dev"],
  "subject": "hello world",
  "html": "<p>it works!</p>",
  "scheduled_at": "in 1 min"
}

resend.Emails.send(params)
```

```rb
# Ruby
require "resend"

Resend.api_key = "re_xxxxxxxxx"

params = {
  "from": "Acme <onboarding@resend.dev>",
  "to": ["delivered@resend.dev"],
  "subject": "hello world",
  "html": "<p>it works!</p>",
  "scheduled_at": "in 1 min"
}

Resend::Emails.send(params)
```

```go
// Go
package main

import (
	"context"
	"fmt"

	"github.com/resend/resend-go/v3"
)

func main() {
	ctx := context.TODO()
	client := resend.NewClient("re_xxxxxxxxx")

	params := &resend.SendEmailRequest{
		From:        "Acme <onboarding@resend.dev>",
		To:          []string{"delivered@resend.dev"},
		Subject:     "hello world",
		Html:        "<p>it works!</p>",
		ScheduledAt: "in 1 min",
	}

	sent, err := client.Emails.SendWithContext(ctx, params)

	if err != nil {
		panic(err)
	}
	fmt.Println(sent.Id)
}
```

```rust
// Rust
use resend_rs::types::CreateEmailBaseOptions;
use resend_rs::{Resend, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let resend = Resend::new("re_xxxxxxxxx");

  let from = "Acme <onboarding@resend.dev>";
  let to = ["delivered@resend.dev"];
  let subject = "hello world";

  let email = CreateEmailBaseOptions::new(from, to, subject)
    .with_html("<p>it works!</p>")
    .with_scheduled_at("in 1 min");

  let _email = resend.emails.send(email).await?;

  Ok(())
}
```

```java
// Java
import com.resend.*;

public class Main {
    public static void main(String[] args) {
        Resend resend = new Resend("re_xxxxxxxxx");

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from("Acme <onboarding@resend.dev>")
                .to("delivered@resend.dev")
                .subject("hello world")
                .html("<p>it works!</p>")
                .scheduledAt("in 1 min")
                .build();

        CreateEmailResponse data = resend.emails().send(params);
    }
}
```

```csharp
// .NET
using Resend;

IResend resend = ResendClient.Create( "re_xxxxxxxxx" ); // Or from DI

var resp = await resend.EmailSendAsync( new EmailMessage()
{
    From = "Acme <onboarding@resend.dev>",
    To = "delivered@resend.dev",
    Subject = "hello world",
    HtmlBody = "<p>it works!</p>",
    MomentSchedule = "in 1 min",
} );
Console.WriteLine( "Email Id={0}", resp.Content );
```

```bash
# cURL
curl -X POST 'https://api.resend.com/emails' \
     -H 'Authorization: Bearer re_xxxxxxxxx' \
     -H 'Content-Type: application/json' \
     -d $'{
  "from": "Acme <onboarding@resend.dev>",
  "to": ["delivered@resend.dev"],
  "subject": "hello world",
  "html": "<p>it works!</p>",
  "scheduled_at": "in 1 min"
}'
```

```bash
# CLI
resend emails send \
  --from "Acme <onboarding@resend.dev>" \
  --to delivered@resend.dev \
  --subject "hello world" \
  --html "<p>it works!</p>" \
  --scheduled-at "in 1 min"
```

## Schedule using date format

You can also use a date in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format (e.g: `2026-08-05T11:52:01.858Z`).

```ts
// Node.js
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

const oneMinuteFromNow = new Date(Date.now() + 1000 * 60).toISOString();

await resend.emails.send({
  from: 'Acme <onboarding@resend.dev>',
  to: ['delivered@resend.dev'],
  subject: 'hello world',
  html: '<p>it works!</p>',
  scheduledAt: oneMinuteFromNow,
});
```

```php
// PHP
$resend = Resend::client('re_xxxxxxxxx');

$oneMinuteFromNow = (new DateTime())->modify('+1 minute')->format(DateTime::ISO8601);

$resend->emails->send([
  'from' => 'Acme <onboarding@resend.dev>',
  'to' => ['delivered@resend.dev'],
  'subject' => 'hello world',
  'html' => '<p>it works!</p>',
  'scheduled_at' => $oneMinuteFromNow
]);
```

```python
# Python
import resend
from datetime import datetime, timedelta

resend.api_key = "re_xxxxxxxxx"

one_minute_from_now = (datetime.now() + timedelta(minutes=1)).isoformat()

params: resend.Emails.SendParams = {
  "from": "Acme <onboarding@resend.dev>",
  "to": ["delivered@resend.dev"],
  "subject": "hello world",
  "html": "<p>it works!</p>",
  "scheduled_at": one_minute_from_now
}

resend.Emails.send(params)
```

```rb
# Ruby
require "resend"

Resend.api_key = "re_xxxxxxxxx"

one_minute_from_now = (Time.now + 1 * 60).strftime("%Y-%m-%dT%H:%M:%S.%L%z")

params = {
  "from": "Acme <onboarding@resend.dev>",
  "to": ["delivered@resend.dev"],
  "subject": "hello world",
  "html": "<p>it works!</p>",
  "scheduled_at": one_minute_from_now
}

Resend::Emails.send(params)
```

```go
// Go
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/resend/resend-go/v3"
)

func main() {
	ctx := context.TODO()
	client := resend.NewClient("re_xxxxxxxxx")

	oneMinuteFromNow := time.Now().Add(time.Minute * time.Duration(1))
	oneMinuteFromNowISO := oneMinuteFromNow.Format("2006-01-02T15:04:05-0700")

	params := &resend.SendEmailRequest{
		From:        "Acme <onboarding@resend.dev>",
		To:          []string{"delivered@resend.dev"},
		Subject:     "hello world",
		Html:        "<p>it works!</p>",
		ScheduledAt: oneMinuteFromNowISO,
	}

	sent, err := client.Emails.SendWithContext(ctx, params)

	if err != nil {
		panic(err)
	}
	fmt.Println(sent.Id)
}
```

```rust
// Rust
use chrono::{Local, TimeDelta};
use resend_rs::types::CreateEmailBaseOptions;
use resend_rs::{Resend, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let resend = Resend::new("re_xxxxxxxxx");

  let from = "Acme <onboarding@resend.dev>";
  let to = ["delivered@resend.dev"];
  let subject = "hello world";
  let one_minute_from_now = Local::now()
    .checked_add_signed(TimeDelta::minutes(1))
    .unwrap()
    .to_rfc3339();

  let email = CreateEmailBaseOptions::new(from, to, subject)
    .with_html("<p>it works!</p>")
    .with_scheduled_at(&one_minute_from_now);

  let _email = resend.emails.send(email).await?;

  Ok(())
}
```

```java
// Java
import com.resend.*;

public class Main {
    public static void main(String[] args) {
        Resend resend = new Resend("re_xxxxxxxxx");

        String oneMinuteFromNow = Instant
          .now()
          .plus(1, ChronoUnit.MINUTES)
          .toString();

        CreateEmailOptions params = CreateEmailOptions.builder()
                .from("Acme <onboarding@resend.dev>")
                .to("delivered@resend.dev")
                .subject("hello world")
                .html("<p>it works!</p>")
                .scheduledAt(oneMinuteFromNow)
                .build();

        CreateEmailResponse data = resend.emails().send(params);
    }
}
```

```csharp
// .NET
using Resend;

IResend resend = ResendClient.Create( "re_xxxxxxxxx" ); // Or from DI

var resp = await resend.EmailSendAsync( new EmailMessage()
{
    From = "Acme <onboarding@resend.dev>",
    To = "delivered@resend.dev",
    Subject = "hello world",
    HtmlBody = "<p>it works!</p>",
    MomentSchedule = DateTime.UtcNow.AddMinutes( 1 ),
} );
Console.WriteLine( "Email Id={0}", resp.Content );
```

```bash
# cURL
curl -X POST 'https://api.resend.com/emails' \
     -H 'Authorization: Bearer re_xxxxxxxxx' \
     -H 'Content-Type: application/json' \
     -d $'{
  "from": "Acme <onboarding@resend.dev>",
  "to": ["delivered@resend.dev"],
  "subject": "hello world",
  "html": "<p>it works!</p>",
  "scheduled_at": "2026-08-20T11:52:01.858Z"
}'
```

```bash
# CLI
resend emails send \
  --from "Acme <onboarding@resend.dev>" \
  --to delivered@resend.dev \
  --subject "hello world" \
  --html "<p>it works!</p>" \
  --scheduled-at "2026-08-20T11:52:01.858Z"
```

## Schedule emails on the `POST /emails/batch` endpoint

Each email in a batch request can be scheduled independently using natural language or ISO 8601 date format.

```ts
// Node.js
import { Resend } from 'resend';

const resend = new Resend('re_xxxxxxxxx');

const { data, error } = await resend.batch.send([
  {
    from: 'Acme <onboarding@resend.dev>',
    to: ['foo@gmail.com'],
    subject: 'hello world',
    html: '<h1>it works!</h1>',
    scheduledAt: 'in 1 min',
  },
  {
    from: 'Acme <onboarding@resend.dev>',
    to: ['bar@outlook.com'],
    subject: 'world hello',
    html: '<p>it works!</p>',
    scheduledAt: 'in 5 min',
  },
]);
```

```php
// PHP
$resend = Resend::client('re_xxxxxxxxx');

$resend->batch->send([
  [
    'from' => 'Acme <onboarding@resend.dev>',
    'to' => ['foo@gmail.com'],
    'subject' => 'hello world',
    'html' => '<h1>it works!</h1>',
    'scheduled_at' => 'in 1 min'
  ],
  [
    'from' => 'Acme <onboarding@resend.dev>',
    'to' => ['bar@outlook.com'],
    'subject' => 'world hello',
    'html' => '<p>it works!</p>',
    'scheduled_at' => 'in 5 min'
  ]
]);
```

```py
# Python
import resend
from typing import List

resend.api_key = "re_xxxxxxxxx"

params: List[resend.Emails.SendParams] = [
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["foo@gmail.com"],
    "subject": "hello world",
    "html": "<h1>it works!</h1>",
    "scheduled_at": "in 1 min"
  },
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["bar@outlook.com"],
    "subject": "world hello",
    "html": "<p>it works!</p>",
    "scheduled_at": "in 5 min"
  }
]

resend.Batch.send(params)
```

```rb
# Ruby
require "resend"

Resend.api_key = 're_xxxxxxxxx'

params = [
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["foo@gmail.com"],
    "subject": "hello world",
    "html": "<h1>it works!</h1>",
    "scheduled_at": "in 1 min"
  },
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["bar@outlook.com"],
    "subject": "world hello",
    "html": "<p>it works!</p>",
    "scheduled_at": "in 5 min"
  }
]

Resend::Batch.send(params)
```

```go
// Go
package main

import (
	"context"
	"fmt"

	"github.com/resend/resend-go/v3"
)

func main() {

  ctx := context.TODO()

  client := resend.NewClient("re_xxxxxxxxx")

  var batchEmails = []*resend.SendEmailRequest{
    {
      From:        "Acme <onboarding@resend.dev>",
      To:          []string{"foo@gmail.com"},
      Subject:     "hello world",
      Html:        "<h1>it works!</h1>",
      ScheduledAt: "in 1 min",
    },
    {
      From:        "Acme <onboarding@resend.dev>",
      To:          []string{"bar@outlook.com"},
      Subject:     "world hello",
      Html:        "<p>it works!</p>",
      ScheduledAt: "in 5 min",
    },
  }

  sent, err := client.Batch.SendWithContext(ctx, batchEmails)

  if err != nil {
    panic(err)
  }
  fmt.Println(sent.Data)
}
```

```rust
// Rust
use resend_rs::types::CreateEmailBaseOptions;
use resend_rs::{Resend, Result};

#[tokio::main]
async fn main() -> Result<()> {
  let resend = Resend::new("re_xxxxxxxxx");

  let emails = vec![
    CreateEmailBaseOptions::new(
      "Acme <onboarding@resend.dev>",
      vec!["foo@gmail.com"],
      "hello world",
    )
    .with_html("<h1>it works!</h1>")
    .with_scheduled_at("in 1 min"),
    CreateEmailBaseOptions::new(
      "Acme <onboarding@resend.dev>",
      vec!["bar@outlook.com"],
      "world hello",
    )
    .with_html("<p>it works!</p>")
    .with_scheduled_at("in 5 min"),
  ];

  let _emails = resend.batch.send(emails).await?;

  Ok(())
}
```

```java
// Java
import com.resend.*;
import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        Resend resend = new Resend("re_xxxxxxxxx");

        CreateEmailOptions firstEmail = CreateEmailOptions.builder()
            .from("Acme <onboarding@resend.dev>")
            .to("foo@gmail.com")
            .subject("hello world")
            .html("<h1>it works!</h1>")
            .scheduledAt("in 1 min")
            .build();

        CreateEmailOptions secondEmail = CreateEmailOptions.builder()
            .from("Acme <onboarding@resend.dev>")
            .to("bar@outlook.com")
            .subject("world hello")
            .html("<p>it works!</p>")
            .scheduledAt("in 5 min")
            .build();

        CreateBatchEmailsResponse data = resend.batch().send(
            Arrays.asList(firstEmail, secondEmail)
        );
    }
}
```

```csharp
// .NET
using Resend;

IResend resend = ResendClient.Create( "re_xxxxxxxxx" ); // Or from DI

var mail1 = new EmailMessage()
{
    From = "Acme <onboarding@resend.dev>",
    To = "foo@gmail.com",
    Subject = "hello world",
    HtmlBody = "<h1>it works!</h1>",
    MomentSchedule = "in 1 min",
};

var mail2 = new EmailMessage()
{
    From = "Acme <onboarding@resend.dev>",
    To = "bar@outlook.com",
    Subject = "world hello",
    HtmlBody = "<p>it works!</p>",
    MomentSchedule = "in 5 min",
};

var resp = await resend.EmailBatchAsync( [ mail1, mail2 ] );
Console.WriteLine( "Nr Emails={0}", resp.Content.Count );
```

```bash
# cURL
curl -X POST 'https://api.resend.com/emails/batch' \
     -H 'Authorization: Bearer re_xxxxxxxxx' \
     -H 'Content-Type: application/json' \
     -d $'[
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["foo@gmail.com"],
    "subject": "hello world",
    "html": "<h1>it works!</h1>",
    "scheduled_at": "in 1 min"
  },
  {
    "from": "Acme <onboarding@resend.dev>",
    "to": ["bar@outlook.com"],
    "subject": "world hello",
    "html": "<p>it works!</p>",
    "scheduled_at": "in 5 min"
  }
]'
```

```bash
# CLI
# Each email in emails.json can set its own scheduled_at
resend emails batch --file ./emails.json
```

## View a scheduled email

Once you schedule an email, you can see the scheduled time in the Resend dashboard.

## Reschedule an email

After scheduling an email, you might need to update the scheduled time.

You can do so with the following method:

```ts
// Node.js
resend.emails.update({
  id: '49a3999c-0ce1-4ea6-ab68-afcd6dc2e794',
  scheduledAt: 'in 1 min',
});
```

```php
// PHP
$resend->emails->update('49a3999c-0ce1-4ea6-ab68-afcd6dc2e794', [
  'scheduled_at' => 'in 1 min'
]);
```

```python
# Python
update_params: resend.Emails.UpdateParams = {
  "id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794",
  "scheduled_at": "in 1 min"
}

resend.Emails.update(params=update_params)
```

```rb
# Ruby
update_params = {
  "email_id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794",
  "scheduled_at": "in 1 min"
}

updated_email = Resend::Emails.update(update_params)
```

```go
// Go
package main

import (
	"fmt"

	"github.com/resend/resend-go/v3"
)

func main() {
	client := resend.NewClient("re_xxxxxxxxx")

	updateParams := &resend.UpdateEmailRequest{
		Id:          "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794",
		ScheduledAt: "in 1 min",
	}

	updatedEmail, err := client.Emails.Update(updateParams)

	if err != nil {
		panic(err)
	}
	fmt.Printf("%v\n", updatedEmail)
}
```

```rust
// Rust
let update = UpdateEmailOptions::new()
  .with_scheduled_at("in 1 min");

let _email = resend
  .emails
  .update("49a3999c-0ce1-4ea6-ab68-afcd6dc2e794", update)
  .await?;
```

```java
// Java
UpdateEmailOptions updateParams = UpdateEmailOptions.builder()
  .scheduledAt("in 1 min")
  .build();

UpdateEmailResponse data = resend.emails().update("49a3999c-0ce1-4ea6-ab68-afcd6dc2e794", updateParams);
```

```csharp
// .NET
using Resend;

IResend resend = ResendClient.Create( "re_xxxxxxxxx" ); // Or from DI

await resend.EmailRescheduleAsync(
  new Guid( "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" ),
  "in 1 min"
);
```

```bash
# cURL
curl -X PATCH 'https://api.resend.com/emails/49a3999c-0ce1-4ea6-ab68-afcd6dc2e794' \
     -H 'Authorization: Bearer re_xxxxxxxxx' \
     -H 'Content-Type: application/json' \
     -d $'{
  "scheduled_at": "in 1 min"
}'
```

```bash
# CLI
resend emails update 49a3999c-0ce1-4ea6-ab68-afcd6dc2e794 \
  --scheduled-at "in 1 min"
```

You can also reschedule an email directly in the Resend Dashboard.

## Cancel a scheduled email

> **Warning:** Once an email is canceled, it cannot be rescheduled.

If you need to cancel a scheduled email, you can do so with the following code:

```ts
// Node.js
resend.emails.cancel('49a3999c-0ce1-4ea6-ab68-afcd6dc2e794');
```

```php
// PHP
$resend->emails->cancel('49a3999c-0ce1-4ea6-ab68-afcd6dc2e794');
```

```python
# Python
resend.Emails.cancel(email_id="49a3999c-0ce1-4ea6-ab68-afcd6dc2e794")
```

```rb
# Ruby
Resend::Emails.cancel("49a3999c-0ce1-4ea6-ab68-afcd6dc2e794")
```

```go
// Go
canceled, err := client.Emails.Cancel("49a3999c-0ce1-4ea6-ab68-afcd6dc2e794")
if err != nil {
  panic(err)
}
fmt.Println(canceled.Id)
```

```rust
// Rust
let _canceled = resend
  .emails
  .cancel("49a3999c-0ce1-4ea6-ab68-afcd6dc2e794")
  .await?;
```

```java
// Java
CancelEmailResponse canceled = resend
    .emails()
    .cancel("49a3999c-0ce1-4ea6-ab68-afcd6dc2e794");
```

```csharp
// .NET
using Resend;

IResend resend = ResendClient.Create( "re_xxxxxxxxx" ); // Or from DI

await resend.EmailCancelAsync( new Guid( "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" ) );
```

```bash
# cURL
curl -X POST 'https://api.resend.com/emails/49a3999c-0ce1-4ea6-ab68-afcd6dc2e794/cancel' \
     -H 'Authorization: Bearer re_xxxxxxxxx' \
     -H 'Content-Type: application/json'
```

```bash
# CLI
resend emails cancel 49a3999c-0ce1-4ea6-ab68-afcd6dc2e794
```

You can also cancel a scheduled email in the Resend dashboard.

## Scheduled email failures

Scheduled emails may fail to send for several reasons. When this happens, you'll see a failure notification in the email details screen with specific information about why the email couldn't be sent.

Common failure reasons include:

* **API key is no longer active** - The API key used to schedule the email has been deleted, expired, or suspended. The email cannot be sent.
* **Account under review** - Your account has been flagged for review and sending has been temporarily suspended. Contact [support@resend.com](mailto:support@resend.com) if you believe this is an error.

You can view the failure reason and details in the Resend dashboard by clicking on the failed email.

## Limitations

* Emails sent via SMTP cannot be scheduled

## Try it yourself

- [Next.js (TypeScript)](https://github.com/resend/resend-examples/tree/main/nextjs-resend-examples/typescript/src/app/scheduling)
- [Next.js (JavaScript)](https://github.com/resend/resend-examples/tree/main/nextjs-resend-examples/javascript/src/app/scheduling)
- [PHP](https://github.com/resend/resend-examples/tree/main/php-resend-examples/src/scheduling)
- [Laravel](https://github.com/resend/resend-examples/tree/main/laravel-resend-examples)
- [Python](https://github.com/resend/resend-examples/tree/main/python-resend-examples/examples)
- [Ruby](https://github.com/resend/resend-examples/tree/main/ruby-resend-examples/examples)
